import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PoolClient } from "pg";
import { parseBody } from "../common/validation";
import { checkoutSchema } from "../schemas/api.schemas";
import { AuthUser } from "./auth.service";
import { CartService } from "./cart.service";
import { CustomerAuthService } from "./customer-auth.service";
import { DatabaseService } from "./database.service";
import { randomUUID } from "crypto";

@Injectable()
export class OrderService {
  constructor(
    private readonly db: DatabaseService,
    private readonly carts: CartService,
    private readonly customers: CustomerAuthService
  ) {}

  async checkout(authorization: string | undefined, body: unknown) {
  const user = await this.customers.currentUser(authorization);
  const data = parseBody(checkoutSchema, body);
  // NOTE: data.outlet_id is now unused for order creation — outlet is resolved
  // per cart item instead, since a cart can span multiple outlets.
  // Kept in the schema for backward compatibility; not removed without team approval.

  return this.db.transaction(async (client) => {
    const cart = await this.carts.getOrCreateCart(user.id, client);
    const cartItems = await client.query(
      `SELECT id, product_id, quantity, unit_price, subtotal FROM api_cartitem WHERE cart_id = $1`,
      [cart.id]
    );
    if (!cartItems.rows.length) throw new BadRequestException("Cart is empty.");

    // Resolve each cart item's actual outlet via InventoryItems -> Inventory -> outletId
    const itemsWithOutlet = await Promise.all(
      cartItems.rows.map(async (item) => {
        const result = await client.query(
          `SELECT inv."outletId"
           FROM "InventoryItems" ii
           JOIN "Inventory" inv ON inv.id = ii."inventoryId"
           WHERE ii.id = $1`,
          [item.product_id]
        );
        if (!result.rows[0]) throw new BadRequestException(`Could not resolve outlet for cart item ${item.id}`);
        return { ...item, outletId: result.rows[0].outletId };
      })
    );

    // Group cart items by outletId
    const groupedByOutlet = new Map<number, typeof itemsWithOutlet>();
    for (const item of itemsWithOutlet) {
      const group = groupedByOutlet.get(item.outletId) ?? [];
      group.push(item);
      groupedByOutlet.set(item.outletId, group);
    }

    const customer = await this.ensureCustomer(client, user);
    const checkoutGroupId = randomUUID();
    const paymentReference = randomUUID(); // shared payment reference across sibling orders
    const createdOrders = [];

    for (const [outletId, groupItems] of groupedByOutlet) {
      const outlet = await client.query(`SELECT id, name, address FROM "Outlet" WHERE id = $1`, [outletId]);
      if (!outlet.rows[0]) throw new BadRequestException(`Invalid outlet: ${outletId}`);

      const addressId = await this.ensureOrderAddress(client, customer.id, outlet.rows[0], data);
      const subtotal = groupItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
      const deliveryFee = data.order_type === "DELIVERY" ? 50 : 0;
      const transactionNumber = `KMP-${Math.floor(100000 + Math.random() * 900000)}`;

      const order = await client.query(
        `
        INSERT INTO "KompraCOrder"
          ("transactionNumber", "customerId", "outletId", "checkoutGroupId", "deliveryAddressId", subtotal, total,
           status, "paymentMethod", "paymentStatus", "paymentReference", "riderName", "riderPhone",
           "customerNote", "outletNote", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,'pending',$9,'','',$10,'',NOW(),NOW())
        RETURNING id, "transactionNumber", subtotal, total, status, "paymentMethod",
                  "paymentStatus", "customerNote", "createdAt"
        `,
        [
          transactionNumber, customer.id, outletId, checkoutGroupId, addressId,
          subtotal, subtotal + deliveryFee, this.mapPaymentMethod(data.payment_method),
          paymentReference, data.customer_note,
        ]
      );

      if (deliveryFee > 0) {
        await client.query(
          `INSERT INTO "KompraCOrderFee" ("orderId", type, label, amount) VALUES ($1, 'delivery', 'Delivery Fee', $2)`,
          [order.rows[0].id, deliveryFee]
        );
      }
      await this.createOrderItems(client, order.rows[0].id, groupItems);
      for (const courierId of data.courier_ids) {
        await client.query(`INSERT INTO "OrderCourierPreference" (order_id, courier_id) VALUES ($1, $2)`, [order.rows[0].id, courierId]);
      }

      createdOrders.push(await this.serializeOrder(order.rows[0], client));
    }

    await client.query(`DELETE FROM api_cartitem WHERE cart_id = $1`, [cart.id]);
    return createdOrders; // array now, not a single order
  });
}

  async orders(authorization?: string) {
    const user = await this.customers.currentUser(authorization);
    const orders = await this.db.query(
      `SELECT o.id, o."transactionNumber", o.subtotal, o.total, o.status, o."paymentMethod",
              o."paymentStatus", o."customerNote", o."createdAt"
       FROM "KompraCOrder" o
       JOIN "KompraCustomer" c ON c.id = o."customerId"
       WHERE lower(c.email)=lower($1)
       ORDER BY o."createdAt" DESC`,
      [user.email]
    );
    return Promise.all(orders.rows.map((order) => this.serializeOrder(order)));
  }

  async order(authorization: string | undefined, id: number) {
    const user = await this.customers.currentUser(authorization);
    const order = await this.db.query(
      `SELECT o.id, o."transactionNumber", o.subtotal, o.total, o.status, o."paymentMethod",
              o."paymentStatus", o."customerNote", o."createdAt"
       FROM "KompraCOrder" o
       JOIN "KompraCustomer" c ON c.id = o."customerId"
       WHERE o.id=$1 AND lower(c.email)=lower($2)`,
      [id, user.email]
    );
    if (!order.rows[0]) throw new NotFoundException({ error: "Order not found." });
    return this.serializeOrder(order.rows[0]);
  }

  async cancelOrder(authorization: string | undefined, id: number) {
    await this.customers.currentUser(authorization);
    await this.db.query(`UPDATE "KompraCOrder" SET status = 'cancelled', "updatedAt" = NOW() WHERE id = $1`, [id]);
    return { message: "Order cancelled successfully." };
  }

  private async createOrderItems(client: PoolClient, orderId: number, cartItems: any[]) {
    for (const item of cartItems) {
      const inventory = await client.query(
        `SELECT id, "itemId", quantity FROM "InventoryItems" WHERE id = $1 FOR UPDATE`,
        [item.product_id]
      );
      if (!inventory.rows[0]) throw new BadRequestException(`Inventory item not found for cart item ${item.id}`);
      if (Number(inventory.rows[0].quantity) < Number(item.quantity)) throw new BadRequestException("Insufficient stock.");
      await client.query(`UPDATE "InventoryItems" SET quantity = quantity - $1 WHERE id = $2`, [item.quantity, item.product_id]);
      await client.query(
        `INSERT INTO "KompraCOrderItem"
          ("orderId", "inventoryItemId", "itemId", quantity, "priceSnapshot", subtotal, "unitId")
         VALUES ($1,$2,$3,$4,$5,$6,NULL)`,
        [orderId, item.product_id, inventory.rows[0].itemId, item.quantity, item.unit_price, item.subtotal]
      );
    }
  }

  private async serializeOrder(order: any, client?: PoolClient) {
  const runQuery = client
    ? (text: string, params: unknown[]) => client.query(text, params)
    : (text: string, params: unknown[]) => this.db.query(text, params);

  const items = await runQuery(
    `SELECT oi.id, oi."itemId" AS itemid, i.name AS product_name,
            oi.quantity, oi."priceSnapshot" AS pricesnapshot, oi.subtotal
     FROM "KompraCOrderItem" oi
     LEFT JOIN "Item" i ON i.id = oi."itemId"
     WHERE oi."orderId"=$1`,
    [order.id]
  );
  const fee = await runQuery(`SELECT amount FROM "KompraCOrderFee" WHERE "orderId"=$1 AND lower(type::text)='delivery' LIMIT 1`, [order.id]);
  const couriers = await runQuery(
    `SELECT c.id, c.name, c.phone FROM "OrderCourierPreference" p JOIN "Courier" c ON c.id = p.courier_id WHERE p.order_id=$1`,
    [order.id]
  );

  // NEW: fetch outlet name and infer order type from delivery address label
  const outletAndAddress = await runQuery(
    `SELECT o.name AS outlet_name, da.label AS address_label, da.address AS address_text
     FROM "KompraCOrder" ord
     LEFT JOIN "Outlet" o ON o.id = ord."outletId"
     LEFT JOIN "DeliveryAddress" da ON da.id = ord."deliveryAddressId"
     WHERE ord.id = $1`,
    [order.id]
  );
  const outletInfo = outletAndAddress.rows[0] || {};
  const orderType = outletInfo.address_label === "Pickup" ? "PICKUP" : "DELIVERY";

  return {
    id: order.id, transactionnumber: order.transactionNumber, subtotal: order.subtotal,
    total: order.total, status: order.status, paymentmethod: order.paymentMethod,
    paymentstatus: order.paymentStatus, customernote: order.customerNote,
    createdat: order.createdAt, items: items.rows, tracking: [],
    order_type: orderType,
    outlet_name: outletInfo.outlet_name || null,
    delivery_address: orderType === "DELIVERY" ? outletInfo.address_text : null,
    current_step: 1,
    delivery_fee: fee.rows[0]?.amount || 0, couriers: couriers.rows,
  };
}

  private async ensureCustomer(client: PoolClient, user: AuthUser) {
    const existing = await client.query(
      `SELECT id, fullname, email, phone, "isVerified" FROM "KompraCustomer" WHERE lower(email)=lower($1) LIMIT 1`,
      [user.email]
    );
    if (existing.rows[0]) {
      await client.query(`UPDATE "KompraCustomer" SET fullname=$1, phone=$2, "isVerified"=$3, "updatedAt"=NOW() WHERE id=$4`, [user.full_name, user.contact_number, user.is_verified, existing.rows[0].id]);
      return existing.rows[0];
    }
    return (await client.query(
      `INSERT INTO "KompraCustomer"
        (fullname, email, "passwordHash", "profilePhoto", "isVerified", "isActive", "createdAt", "updatedAt", phone)
       VALUES ($1,$2,$3,'',$4,true,NOW(),NOW(),$5)
       RETURNING id, fullname, email, phone, "isVerified"`,
      [user.full_name, user.email, user.password, user.is_verified, user.contact_number]
    )).rows[0];
  }

  private async ensureOrderAddress(client: PoolClient, customerId: number, outlet: any, data: any) {
    if (data.order_type === "DELIVERY" && data.delivery_address_id) {
      const address = await client.query(`SELECT label, street_address, barangay, city, province, region, postal_code, lat, lng, is_default FROM api_deliveryaddress WHERE id=$1`, [data.delivery_address_id]);
      if (address.rows[0]) {
        const a = address.rows[0];
        const full = `${a.street_address}, ${a.barangay}, ${a.city}, ${a.province}, ${a.region}, ${a.postal_code}`;
        return (await client.query(
          `INSERT INTO "DeliveryAddress" ("customerId", label, address, latitude, longitude, "isDefault", "createdAt") VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
          [customerId, a.label, full, Number(a.lat), Number(a.lng), a.is_default]
        )).rows[0].id;
      }
    }
    const pickup = `Pickup at ${outlet.name}${outlet.address ? `, ${outlet.address}` : ""}`;
    return (await client.query(
      `INSERT INTO "DeliveryAddress" ("customerId", label, address, latitude, longitude, "isDefault", "createdAt") VALUES ($1,'Pickup',$2,0,0,false,NOW()) RETURNING id`,
      [customerId, pickup]
    )).rows[0].id;
  }

  private mapPaymentMethod(method: string) {
    return { COD: "cash_on_delivery", GCASH: "gcash", PAYMAYA: "paymaya", CARD: "card", QRPH: "qrph", PAY_AT_STORE: "cash_on_delivery", ONLINE: "gcash" }[method] || method;
  }
}
