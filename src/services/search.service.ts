import { BadRequestException, Injectable } from "@nestjs/common";
import { DatabaseService } from "./database.service";
import { AuthService } from "./auth.service";

@Injectable()
export class SearchService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auth: AuthService
  ) { }

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

  // Guest-fallback path for Task 1 (searchSuggestions).
  // Ranks by global popularity (total times ordered, across all users),
  // with proximity as a tiebreaker when coordinates are available.
  // The authenticated/personalized branch is a separate method that will
  // reuse this same shape but filter popularity by customerId instead.
  async searchSuggestionsGuest(keyword?: string, lat?: string, lng?: string) {
    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestException({ error: "keyword is required." });
    }

    const parsedLat = lat !== undefined ? Number(lat) : undefined;
    const parsedLng = lng !== undefined ? Number(lng) : undefined;
    if ((lat !== undefined && Number.isNaN(parsedLat)) || (lng !== undefined && Number.isNaN(parsedLng))) {
      throw new BadRequestException({ error: "lat and lng must be valid numbers." });
    }

    const hasCoords = parsedLat !== undefined && parsedLng !== undefined;

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

    // NULLS LAST keeps the sort well-defined even when distance is NULL
    // (i.e. no coordinates were provided).
    const orderBy = `order_count DESC, distance ASC NULLS LAST`;

    const sql = `
      WITH item_popularity AS (
        SELECT "itemId", COUNT(*) AS order_count
        FROM "KompraCOrderItem"
        GROUP BY "itemId"
      )
      SELECT
        i.id AS item_id, i.name AS item_name, i.image,
        o."outletId" AS outlet_id, ot.name AS outlet_name, ot."bannerImage" AS outlet_photo,
        o.price, o.quantity,
        COALESCE(ip.order_count, 0) AS order_count,
        ${distanceSelect} AS distance
      FROM "Item" i
      JOIN "OutletItemSearchIndex" o ON o."itemId" = i.id
      JOIN "Outlet" ot ON ot.id = o."outletId"
      LEFT JOIN item_popularity ip ON ip."itemId" = i.id
      WHERE i.name ILIKE $${keywordParamIndex}
        AND o.quantity > 0
      ORDER BY ${orderBy}
      LIMIT 8
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
        order_count: Number(row.order_count),
        distance_km: row.distance !== null ? Number(row.distance) : null,
      })),
      personalized: false,
    };
  }

  // Personalized path for Task 1 (searchSuggestions).
  // Ranks by how many times THIS customer has personally ordered the item,
  // as an approved substitute for "click affinity" (no click-tracking table
  // exists yet in the DB — confirmed with Emman, see Task 1 ClickUp notes).
  async searchSuggestionsPersonalized(
    customerId: number,
    keyword?: string,
    lat?: string,
    lng?: string
  ) {
    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestException({ error: "keyword is required." });
    }

    const parsedLat = lat !== undefined ? Number(lat) : undefined;
    const parsedLng = lng !== undefined ? Number(lng) : undefined;
    if ((lat !== undefined && Number.isNaN(parsedLat)) || (lng !== undefined && Number.isNaN(parsedLng))) {
      throw new BadRequestException({ error: "lat and lng must be valid numbers." });
    }

    const hasCoords = parsedLat !== undefined && parsedLng !== undefined;

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

    const customerIdParamIndex = paramIndex;
    params.push(customerId);
    paramIndex++;

    const keywordParamIndex = paramIndex;
    params.push(`%${keyword.trim()}%`);
    paramIndex++;

    const orderBy = `affinity_count DESC, distance ASC NULLS LAST`;

    const sql = `
      WITH item_affinity AS (
        SELECT koi."itemId", COUNT(*) AS affinity_count
        FROM "KompraCOrderItem" koi
        JOIN "KompraCOrder" ko ON ko.id = koi."orderId"
        WHERE ko."customerId" = $${customerIdParamIndex}
        GROUP BY koi."itemId"
      )
      SELECT
        i.id AS item_id, i.name AS item_name, i.image,
        o."outletId" AS outlet_id, ot.name AS outlet_name, ot."bannerImage" AS outlet_photo,
        o.price, o.quantity,
        COALESCE(ia.affinity_count, 0) AS affinity_count,
        ${distanceSelect} AS distance
      FROM "Item" i
      JOIN "OutletItemSearchIndex" o ON o."itemId" = i.id
      JOIN "Outlet" ot ON ot.id = o."outletId"
      LEFT JOIN item_affinity ia ON ia."itemId" = i.id
      WHERE i.name ILIKE $${keywordParamIndex}
        AND o.quantity > 0
      ORDER BY ${orderBy}
      LIMIT 8
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
        affinity_count: Number(row.affinity_count),
        distance_km: row.distance !== null ? Number(row.distance) : null,
      })),
      personalized: true,
    };
  }

  // Top-level entry point for Task 1. Resolves auth (safely — never throws
  // for a missing/invalid token, since guests are allowed to search too),
  // then branches to the personalized or guest query.
  //
  // Note: AuthService.requireUser() returns an api_user row, not a
  // KompraCustomer row. KompraCOrder.customerId references KompraCustomer.id,
  // so we resolve api_user -> KompraCustomer via matching email (no FK link
  // between these tables currently — verified 1:1 on current data, but if a
  // match isn't found for some future user, we safely fall back to the guest
  // path rather than erroring).
  async searchSuggestions(
    authorization: string | undefined,
    keyword?: string,
    lat?: string,
    lng?: string
  ) {
    const authUser = await this.auth.requireUser(authorization);

    if (authUser) {
      const customerResult = await this.db.query(
        `SELECT id FROM "KompraCustomer" WHERE lower(email) = lower($1) LIMIT 1`,
        [authUser.email]
      );
      const customerId = customerResult.rows[0]?.id;

      if (customerId) {
        return this.searchSuggestionsPersonalized(customerId, keyword, lat, lng);
      }
    }

    return this.searchSuggestionsGuest(keyword, lat, lng);
  }
}