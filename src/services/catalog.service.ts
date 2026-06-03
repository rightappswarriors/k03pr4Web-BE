import { Injectable, NotFoundException } from "@nestjs/common";
import { CacheService } from "../common/cache.service";
import { DatabaseService } from "./database.service";

type Query = Record<string, string | undefined>;

@Injectable()
export class CatalogService {
  constructor(private readonly db: DatabaseService, private readonly cache: CacheService) {}

  products(query: Query) {
    return this.cache.remember(`products:${JSON.stringify(query)}`, 30_000, () => this.loadProducts(query));
  }

  async product(id: number) {
    const result = await this.db.query(
      `
      ${this.productSelect()}
      WHERE ii.quantity > 0 AND ii.id = $1
      LIMIT 1
      `,
      [id]
    );
    if (!result.rows[0]) throw new NotFoundException({ error: "Product not found." });
    return result.rows[0];
  }

  categories() {
    return this.cache.remember("categories", 60_000, async () => {
      const result = await this.db.query(
        `
        SELECT c.id, c.name, c.description, c.icon,
          COUNT(DISTINCT i.id) FILTER (WHERE ii.quantity > 0) AS product_count
        FROM "ItemCategory" c
        LEFT JOIN "Item" i ON i."categoryId" = c.id
        LEFT JOIN "InventoryItems" ii ON ii."itemId" = i.id
        GROUP BY c.id, c.name, c.description, c.icon
        ORDER BY c.name
        `
      );
      return result.rows.map((row) => ({ ...row, product_count: Number(row.product_count) }));
    });
  }

  organizations() {
    return this.cache.remember("organizations", 60_000, async () => {
      const orgs = await this.db.query(
        `SELECT id, name, "createdAt", "bannerImg", "contactNumber", email, location,
                "profilePhoto", "facebookLink", "instagramLink", "twitterLink", bio
         FROM "Organization"
         ORDER BY name`
      );
      return Promise.all(orgs.rows.map((org) => this.serializeOrganization(org)));
    });
  }

  async organization(id: number) {
    const org = await this.db.query(
      `SELECT id, name, "createdAt", "bannerImg", "contactNumber", email, location,
              "profilePhoto", "facebookLink", "instagramLink", "twitterLink", bio
       FROM "Organization"
       WHERE id = $1`,
      [id]
    );
    if (!org.rows[0]) throw new NotFoundException({ error: "Organization not found" });
    return this.serializeOrganization(org.rows[0]);
  }

  async organizationBySlug(slug: string) {
    const orgs = await this.organizations();
    const found = orgs.find((org: any) => this.slugify(org.name) === slug);
    if (!found) throw new NotFoundException({ error: "Organization not found" });
    return found;
  }

  async branch(id: number) {
    const branch = await this.db.query(
      `SELECT id, name, address, phone, "isActive", "createdAt", "locationId", "orgId"
       FROM "Branch"
       WHERE id = $1`,
      [id]
    );
    if (!branch.rows[0]) throw new NotFoundException({ error: "Branch not found." });
    return { ...branch.rows[0], outlets: await this.outlets({ branch: String(id) }) };
  }

  async outlets(query: Query) {
    const params: unknown[] = [];
    const filters: string[] = [];
    if (query.organization) {
      params.push(Number(query.organization));
      filters.push(`o."orgId" = $${params.length}`);
    }
    if (query.branch) {
      params.push(Number(query.branch));
      filters.push(`o."branchId" = $${params.length}`);
    }
    const result = await this.db.query(
      `
      SELECT o.id, o.name, o.address, o.phone, o.code, o."outletType", o."isActive",
             o."createdAt", o.latitude, o.longitude, o."bannerImage", o."orgId",
             org.name AS org_name, br.id AS branch_id, br.name AS branch_name,
             br.address AS branch_address, br.phone AS branch_phone
      FROM "Outlet" o
      LEFT JOIN "Organization" org ON org.id = o."orgId"
      LEFT JOIN "Branch" br ON br.id = o."branchId"
      ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
      ORDER BY o.name
      `,
      params
    );
    return result.rows.map(this.serializeOutlet);
  }

  async outlet(id: number) {
    const found = (await this.outlets({})).find((row: any) => Number(row.id) === id);
    if (!found) throw new NotFoundException({ error: "Outlet not found." });
    return found;
  }

  async search(q: string) {
    const query = q.trim();
    if (!query) return { products: [], stores: [], categories: [], organizations: [], branches: [] };
    const like = `%${query}%`;
    return {
      products: (await this.products({ search: query })).slice(0, 12),
      stores: (await this.db.query(`SELECT id, name, address, phone FROM "Outlet" WHERE name ILIKE $1 OR address ILIKE $1 OR phone ILIKE $1 ORDER BY name LIMIT 8`, [like])).rows,
      categories: (await this.db.query(`SELECT id, name, description FROM "ItemCategory" WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY name LIMIT 8`, [like])).rows,
      organizations: (await this.db.query(`SELECT id, name FROM "Organization" WHERE name ILIKE $1 ORDER BY name LIMIT 8`, [like])).rows,
      branches: (await this.db.query(`SELECT id, name, address, phone FROM "Branch" WHERE name ILIKE $1 OR address ILIKE $1 OR phone ILIKE $1 ORDER BY name LIMIT 8`, [like])).rows,
    };
  }

  async organizationSearch(orgId: number, q: string) {
    const query = q.trim();
    if (!query) return { products: [], stores: [], branches: [] };
    const like = `%${query}%`;
    return {
      products: (await this.products({ search: query })).filter((product: any) => Number(product.orgid) === orgId),
      stores: (await this.db.query(`SELECT id, name, address, phone FROM "Outlet" WHERE "orgId"=$1 AND (name ILIKE $2 OR address ILIKE $2)`, [orgId, like])).rows,
      branches: (await this.db.query(`SELECT id, name, address, phone FROM "Branch" WHERE "orgId"=$1 AND (name ILIKE $2 OR address ILIKE $2)`, [orgId, like])).rows,
    };
  }

  async orgItemCategories(orgId: number) {
    const result = await this.db.query(
      `SELECT id, name, description, "isActive", "orgId", "categoryId" FROM "OrgItemCategory" WHERE "orgId"=$1 AND "isActive"=true`,
      [orgId]
    );
    return result.rows;
  }

  async couriers() {
    return (await this.db.query(`SELECT id, name, phone FROM "Courier" ORDER BY name`)).rows;
  }

  private async loadProducts(query: Query) {
    const params: unknown[] = [];
    const filters = [`ii.quantity > 0`];
    if (query.category) {
      params.push(Number(query.category));
      filters.push(`(i."categoryId" = $${params.length} OR oc."categoryId" = $${params.length})`);
    }
    if (query.outlet) {
      params.push(Number(query.outlet));
      filters.push(`o.id = $${params.length}`);
    }
    if (query.search?.trim()) {
      params.push(`%${query.search.trim()}%`);
      filters.push(`(i.name ILIKE $${params.length} OR i.description ILIKE $${params.length} OR c.name ILIKE $${params.length} OR oc.name ILIKE $${params.length} OR o.name ILIKE $${params.length})`);
    }
    return (await this.db.query(`${this.productSelect()} WHERE ${filters.join(" AND ")} ORDER BY i.name`, params)).rows;
  }

  private productSelect() {
    return `
      SELECT DISTINCT ii.id AS inventory_item_id, i.id AS product_id, i.name, i.image,
        i.description, COALESCE(c.id, occ.id) AS category_id,
        COALESCE(c.name, occ.name, oc.name) AS category_name, b.name AS brand,
        ii.price, ii.quantity, o.id AS outlet_id, o.name AS outlet_name,
        o.address AS outlet_address, o."orgId" AS orgid, br.name AS branch_name,
        br.address AS branch_address, br.phone AS branch_phone, o.phone AS outlet_phone
      FROM "InventoryItems" ii
      JOIN "Item" i ON i.id = ii."itemId"
      LEFT JOIN "ItemCategory" c ON c.id = i."categoryId"
      LEFT JOIN "OrgItemCategory" oc ON oc.id = i."orgCategoryId"
      LEFT JOIN "ItemCategory" occ ON occ.id = oc."categoryId"
      LEFT JOIN "Brand" b ON b.id = i."brandId"
      JOIN "Inventory" inv ON inv.id = ii."inventoryId"
      JOIN "Outlet" o ON o.id = inv."outletId"
      LEFT JOIN "Branch" br ON br.id = o."branchId"`;
  }

  private async serializeOrganization(org: any) {
    const branches = await this.branchesForOrg(org.id);
    const outlets = await this.db.query(`SELECT COUNT(id) FROM "Outlet" WHERE "orgId" = $1 AND "isActive" = true`, [org.id]);
    return {
      id: org.id, name: org.name, createdat: org.createdAt, bannerimg: org.bannerImg,
      contactnumber: org.contactNumber, email: org.email, location: org.location,
      profilephoto: org.profilePhoto, facebooklink: org.facebookLink,
      instagramlink: org.instagramLink, twitterlink: org.twitterLink, bio: org.bio,
      branches, total_branches: branches.length, total_outlets: Number(outlets.rows[0]?.count || 0),
    };
  }

  private async branchesForOrg(orgId: number) {
    const branches = await this.db.query(
      `SELECT id, name, address, phone, "isActive", "createdAt", "locationId", "orgId" FROM "Branch" WHERE "orgId" = $1 AND "isActive" = true ORDER BY name`,
      [orgId]
    );
    return Promise.all(branches.rows.map(async (branch) => ({
      id: branch.id, name: branch.name, address: branch.address, phone: branch.phone,
      isactive: branch.isActive, createdat: branch.createdAt, locationid: branch.locationId,
      orgid: branch.orgId, outlets: await this.outlets({ branch: String(branch.id) }),
    })));
  }

  private serializeOutlet(row: any) {
    return {
      id: row.id, name: row.name, address: row.address, phone: row.phone, code: row.code,
      outlettype: row.outletType, isactive: row.isActive, createdat: row.createdAt,
      latitude: row.latitude, longitude: row.longitude, bannerimage: row.bannerImage,
      orgid: row.orgId, org_name: row.org_name, branch_id: row.branch_id,
      branch_name: row.branch_name, branch_address: row.branch_address, branch_phone: row.branch_phone,
    };
  }

  private slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
}
