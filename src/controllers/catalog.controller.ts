import { Controller, Get, Param, Query } from "@nestjs/common";
import { parsePositiveId } from "../common/validation";
import { CatalogService } from "../services/catalog.service";

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("products")
  products(@Query() query: Record<string, string>) {
    return this.catalog.products(query);
  }

  @Get("products/:id")
  product(@Param("id") id: string) {
    return this.catalog.product(parsePositiveId(id));
  }

  @Get("categories")
  categories() {
    return this.catalog.categories();
  }

  @Get("search")
  search(@Query("q") q = "") {
    return this.catalog.search(q);
  }

  @Get("organizations")
  organizations() {
    return this.catalog.organizations();
  }

  @Get("organizations/slug/:slug")
  organizationBySlug(@Param("slug") slug: string) {
    return this.catalog.organizationBySlug(slug);
  }

  @Get("organizations/:id")
  organization(@Param("id") id: string) {
    return this.catalog.organization(parsePositiveId(id));
  }

  @Get("branches/:id")
  branch(@Param("id") id: string) {
    return this.catalog.branch(parsePositiveId(id));
  }

  @Get("outlets")
  outlets(@Query() query: Record<string, string>) {
    return this.catalog.outlets(query);
  }

  @Get("outlets/:id")
  outlet(@Param("id") id: string) {
    return this.catalog.outlet(parsePositiveId(id));
  }

  @Get("org-item-categories/:orgId")
  orgItemCategories(@Param("orgId") orgId: string) {
    return this.catalog.orgItemCategories(parsePositiveId(orgId, "orgId"));
  }

  @Get("couriers")
  couriers() {
    return this.catalog.couriers();
  }

  @Get("organization/:orgId/search")
  organizationSearch(@Param("orgId") orgId: string, @Query("q") q = "") {
    return this.catalog.organizationSearch(parsePositiveId(orgId, "orgId"), q);
  }
}
