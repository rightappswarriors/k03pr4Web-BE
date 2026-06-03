import { Injectable, NotFoundException } from "@nestjs/common";
import { parseBody } from "../common/validation";
import { addressSchema } from "../schemas/api.schemas";
import { CustomerAuthService } from "./customer-auth.service";
import { DatabaseService } from "./database.service";

@Injectable()
export class AddressService {
  constructor(private readonly db: DatabaseService, private readonly customers: CustomerAuthService) {}

  async addresses(authorization?: string) {
    const user = await this.customers.currentUser(authorization);
    const result = await this.db.query(
      `SELECT id, full_name, phone, region, province, city, barangay, street_address,
              postal_code, label, is_default, lat, lng
       FROM api_deliveryaddress
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [user.id]
    );
    return result.rows.map(this.serializeAddress);
  }

  async createAddress(authorization: string | undefined, body: unknown) {
    const user = await this.customers.currentUser(authorization);
    const data = parseBody(addressSchema, body);
    if (data.is_default) await this.db.query(`UPDATE api_deliveryaddress SET is_default = false WHERE user_id = $1`, [user.id]);
    const result = await this.db.query(
      `
      INSERT INTO api_deliveryaddress
        (user_id, full_name, phone, region, province, city, barangay, street_address,
         postal_code, label, is_default, lat, lng, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
      RETURNING id, full_name, phone, region, province, city, barangay, street_address,
                postal_code, label, is_default, lat, lng
      `,
      [user.id, data.full_name, data.phone, data.region, data.province, data.city, data.barangay, data.street_address, data.postal_code, data.label, data.is_default, data.lat, data.lng]
    );
    return this.serializeAddress(result.rows[0]);
  }

  async updateAddress(authorization: string | undefined, id: number, body: unknown) {
    const user = await this.customers.currentUser(authorization);
    const existing = await this.db.query(`SELECT * FROM api_deliveryaddress WHERE id=$1 AND user_id=$2`, [id, user.id]);
    if (!existing.rows[0]) throw new NotFoundException({ error: "Address not found." });
    const data = parseBody(addressSchema.partial(), body);
    const next = { ...existing.rows[0], ...data };
    if (next.is_default) await this.db.query(`UPDATE api_deliveryaddress SET is_default = false WHERE user_id = $1 AND id <> $2`, [user.id, id]);
    const updated = await this.db.query(
      `
      UPDATE api_deliveryaddress SET full_name=$1, phone=$2, region=$3, province=$4,
        city=$5, barangay=$6, street_address=$7, postal_code=$8, label=$9,
        is_default=$10, lat=$11, lng=$12, updated_at=NOW()
      WHERE id=$13 AND user_id=$14
      RETURNING id, full_name, phone, region, province, city, barangay, street_address,
                postal_code, label, is_default, lat, lng
      `,
      [next.full_name, next.phone, next.region, next.province, next.city, next.barangay, next.street_address, next.postal_code, next.label, next.is_default, next.lat, next.lng, id, user.id]
    );
    return this.serializeAddress(updated.rows[0]);
  }

  async deleteAddress(authorization: string | undefined, id: number) {
    const user = await this.customers.currentUser(authorization);
    await this.db.query(`DELETE FROM api_deliveryaddress WHERE id = $1 AND user_id = $2`, [id, user.id]);
    return {};
  }

  private serializeAddress(row: any) {
    return {
      id: row.id, full_name: row.full_name, phone: row.phone, region: row.region,
      province: row.province, city: row.city, barangay: row.barangay,
      street_address: row.street_address, postal_code: row.postal_code,
      label: row.label, is_default: row.is_default, lat: row.lat, lng: row.lng,
    };
  }
}
