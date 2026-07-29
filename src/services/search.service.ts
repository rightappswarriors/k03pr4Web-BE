import { BadRequestException, Injectable } from "@nestjs/common";
import { DatabaseService } from "./database.service";

@Injectable()
export class SearchService {
  constructor(private readonly db: DatabaseService) { }

  async searchItems(
    keyword?: string,
    lat?: string,
    lng?: string,
    limit?: string,
    offset?: string
  ) {
    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestException({ error: "keyword is required." });
    }

    const parsedLat = lat !== undefined ? Number(lat) : undefined;
    const parsedLng = lng !== undefined ? Number(lng) : undefined;
    if ((lat !== undefined && Number.isNaN(parsedLat)) || (lng !== undefined && Number.isNaN(parsedLng))) {
      throw new BadRequestException({ error: "lat and lng must be valid numbers." });
    }

    const parsedLimit = limit ? Math.min(Number(limit), 100) : 40;
    const parsedOffset = offset ? Number(offset) : 0;
    if (Number.isNaN(parsedLimit) || Number.isNaN(parsedOffset)) {
      throw new BadRequestException({ error: "limit and offset must be valid numbers." });
    }

    const hasCoords = parsedLat !== undefined && parsedLng !== undefined;

    // When we have user coordinates, compute Haversine distance in SQL and sort by it.
    // When we don't, we can't rank by distance, so we fall back to quantity DESC.
    const distanceSelect = hasCoords
      ? `6371 * acos(
           cos(radians($1)) * cos(radians(o."outletLatitude")) *
           cos(radians(o."outletLongitude") - radians($2)) +
           sin(radians($1)) * sin(radians(o."outletLatitude"))
         )`
      : `NULL`;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (hasCoords) {
      params.push(parsedLat, parsedLng);
      paramIndex = 3;
    }

    const keywordParamIndex = paramIndex;
    params.push(`%${keyword.trim()}%`);
    paramIndex++;

    const limitParamIndex = paramIndex;
    params.push(parsedLimit);
    paramIndex++;

    const offsetParamIndex = paramIndex;
    params.push(parsedOffset);

    const orderBy = hasCoords
      ? `distance ASC, o.quantity DESC`
      : `o.quantity DESC`;

    const sql = `
      SELECT
        i.id AS item_id, i.name AS item_name, i.image,
        o."outletId" AS outlet_id, ot.name AS outlet_name, ot."bannerImage" AS outlet_photo,
        o.price, o.quantity,
        ${distanceSelect} AS distance
      FROM "Item" i
      JOIN "OutletItemSearchIndex" o ON o."itemId" = i.id
      JOIN "Outlet" ot ON ot.id = o."outletId"
      WHERE i.name ILIKE $${keywordParamIndex}
        AND o.quantity > 0
      ORDER BY ${orderBy}
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const result = await this.db.query(sql, params);

    return {
      items: result.rows.map((row) => ({
        item_id: row.item_id,
        item_name: row.item_name,
        image: row.image,
        outlet_id: row.outlet_id,
        outlet_name: row.outlet_name,
        outlet_photo: row.outlet_photo,
        price: row.price,
        quantity: Number(row.quantity),
        distance_km: row.distance !== null ? Number(row.distance) : null,
      })),
      limit: parsedLimit,
      offset: parsedOffset,
    };
  }
}