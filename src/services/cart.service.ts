import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PoolClient } from "pg";
import { parseBody } from "../common/validation";
import { addCartSchema, updateCartSchema } from "../schemas/api.schemas";
import { CustomerAuthService } from "./customer-auth.service";
import { DatabaseService } from "./database.service";

@Injectable()
export class CartService {
  constructor(private readonly db: DatabaseService, private readonly customers: CustomerAuthService) {}

  async getOrCreateCart(userId: number, client?: PoolClient) {
    const runner: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> } =
      client || this.db;
    const existing = await runner.query(
      "SELECT id, user_id, is_active, created_at, updated_at FROM api_cart WHERE user_id = $1 LIMIT 1",
      [userId]
    );
    if (existing.rows[0]) return existing.rows[0];
    return (await runner.query(
      `INSERT INTO api_cart (user_id, is_active, created_at, updated_at)
       VALUES ($1, true, NOW(), NOW())
       RETURNING id, user_id, is_active, created_at, updated_at`,
      [userId]
    )).rows[0];
  }

  async cart(authorization?: string) {
    const user = await this.customers.currentUser(authorization);
    return this.cartResponse(user.id);
  }

  async addToCart(authorization: string | undefined, body: unknown) {
    const user = await this.customers.currentUser(authorization);
    const data = parseBody(addCartSchema, body);
    const item = await this.db.query(
      `SELECT id, price, quantity FROM "InventoryItems" WHERE id = $1`,
      [data.product_id]
    );
    if (!item.rows[0]) throw new NotFoundException({ error: `Product not found. Sent product_id=${data.product_id}` });
    if (Number(item.rows[0].quantity) < data.quantity) throw new BadRequestException({ error: "Insufficient stock." });

    const cart = await this.getOrCreateCart(user.id);
    const existing = await this.db.query(
      `SELECT id, quantity FROM api_cartitem WHERE cart_id = $1 AND product_id = $2 AND branch_id IS NOT DISTINCT FROM $3`,
      [cart.id, data.product_id, data.branch_id || null]
    );

    if (existing.rows[0]) {
      const quantity = Number(existing.rows[0].quantity) + data.quantity;
      if (Number(item.rows[0].quantity) < quantity) throw new BadRequestException({ error: "Insufficient stock." });
      await this.db.query(
        `UPDATE api_cartitem SET quantity = $1, unit_price = $2, subtotal = $3, updated_at = NOW() WHERE id = $4`,
        [quantity, item.rows[0].price, Number(item.rows[0].price) * quantity, existing.rows[0].id]
      );
    } else {
      await this.db.query(
        `INSERT INTO api_cartitem (cart_id, product_id, branch_id, quantity, unit_price, subtotal, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [cart.id, data.product_id, data.branch_id || null, data.quantity, item.rows[0].price, Number(item.rows[0].price) * data.quantity]
      );
    }
    return this.cartResponse(user.id);
  }

  async updateCartItem(authorization: string | undefined, id: number, body: unknown) {
    const user = await this.customers.currentUser(authorization);
    const data = parseBody(updateCartSchema, body);
    const cart = await this.getOrCreateCart(user.id);
    const item = await this.db.query(
      `SELECT id, product_id FROM api_cartitem WHERE id = $1 AND cart_id = $2`,
      [id, cart.id]
    );
    if (!item.rows[0]) throw new NotFoundException({ error: "Cart item not found." });

    if (data.quantity <= 0) {
      await this.db.query(`DELETE FROM api_cartitem WHERE id = $1`, [id]);
      return this.cartResponse(user.id);
    }

    const inventory = await this.db.query(`SELECT quantity, price FROM "InventoryItems" WHERE id = $1`, [item.rows[0].product_id]);
    if (!inventory.rows[0]) throw new NotFoundException({ error: "Product not found." });
    if (Number(inventory.rows[0].quantity) < data.quantity) throw new BadRequestException({ error: "Insufficient stock." });

    await this.db.query(
      `UPDATE api_cartitem SET quantity = $1, unit_price = $2, subtotal = $3, updated_at = NOW() WHERE id = $4`,
      [data.quantity, inventory.rows[0].price, Number(inventory.rows[0].price) * data.quantity, id]
    );
    return this.cartResponse(user.id);
  }

  async removeCartItem(authorization: string | undefined, id: number) {
    const user = await this.customers.currentUser(authorization);
    const cart = await this.getOrCreateCart(user.id);
    await this.db.query(`DELETE FROM api_cartitem WHERE id = $1 AND cart_id = $2`, [id, cart.id]);
    return this.cartResponse(user.id);
  }

  async cartResponse(userId: number) {
    const cart = await this.getOrCreateCart(userId);
    const items = await this.db.query(
      `
      SELECT ci.id, ci.product_id, ci.branch_id, ci.quantity,
             ci.unit_price::text, ci.subtotal::text, i.name AS product_name,
             i.image, o.name AS outlet_name
      FROM api_cartitem ci
      LEFT JOIN "InventoryItems" ii ON ii.id = ci.product_id
      LEFT JOIN "Item" i ON i.id = ii."itemId"
      LEFT JOIN "Inventory" inv ON inv.id = ii."inventoryId"
      LEFT JOIN "Outlet" o ON o.id = inv."outletId"
      WHERE ci.cart_id = $1
      ORDER BY ci.id
      `,
      [cart.id]
    );
    const rows = items.rows.map((item) => ({
      id: item.id, product_id: item.product_id, branch_id: item.branch_id,
      product_name: item.product_name, image: item.image, outlet_name: item.outlet_name,
      quantity: Number(item.quantity), unit_price: item.unit_price, subtotal: item.subtotal,
    }));
    return {
      id: cart.id, items: rows,
      total_quantity: rows.reduce((sum, item) => sum + item.quantity, 0),
      total_amount: rows.reduce((sum, item) => sum + Number(item.subtotal), 0),
      created_at: cart.created_at, updated_at: cart.updated_at,
    };
  }
}
