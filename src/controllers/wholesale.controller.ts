import { Controller, Get, Param, Post, Body, Query, Headers, Req, UseGuards } from "@nestjs/common";
import { WholesaleService } from "../services/wholesale.service";
import { AgentAuthGuard } from "../guards/agent-auth.guard";

@Controller("wholesale")
export class WholesaleController {
  constructor(private readonly wholesale: WholesaleService) { }

  // Public marketplace endpoints — no agent auth required
  @Get("products")
  products(@Query() query: Record<string, string>) {
    return this.wholesale.products(query);
  }
  // Single aggregated call for the marketplace landing page
  @Get("home")
  home() {
    return this.wholesale.home();
  }

  @Get("categories")
  categories() {
    return this.wholesale.categories();
  }
  @Get("search/suggest")
  suggest(@Query("q") q: string) {
    return this.wholesale.suggestProducts(q);
  }

  @Get("suppliers/featured")
  featuredSuppliers() {
    return this.wholesale.featuredSuppliers();
  }

  // NOTE: products/by-ids MUST come before products/:id so NestJS
  // does not swallow the literal segment "by-ids" as a route param.
  @Get("products/by-ids")
  productsByIds(@Query("ids") ids: string) {
    return this.wholesale.productsByIds(ids ? ids.split(",") : []);
  }

  @Get("products/:id")
  product(@Param("id") id: string) {
    return this.wholesale.product(id);
  }

  @Get("search/popular")
  popularSearches() {
    return this.wholesale.popularSearches();
  }

  @Get("search/frequently-searched-products")
  frequentlySearchedProducts() {
    return this.wholesale.frequentlySearchedProducts();
  }

  @Post("search/track")
  trackSearch(@Body() body: { term: string; userId?: number }) {
    return this.wholesale.trackSearch(body.term, body.userId);
  }
  @Get("quotes")
  quotes() {
    return this.wholesale.quotes();
  }

  // =====================
  // Public pricing endpoints
  // =====================

  @Get("supplier-items/:id/pricing")
  getPricing(@Param("id") id: string) {
    return this.wholesale.getPricing(id);
  }

  @Post("supplier-items/:id/price-quote")
  priceQuote(
    @Param("id") id: string,
    @Body() body: { quantity: number; variantId?: string }
  ) {
    return this.wholesale.priceQuote(id, body);
  }

  // =====================
  // Auth-required endpoints (agent must be logged in)
  // =====================

  @Post("rfq")
  @UseGuards(AgentAuthGuard)
  submitRfq(@Body() data: {
    productId: string;
    quantity: string;
    targetPrice?: string;
    requirements?: string;
    deliveryDate?: string;
    contactMethod: "email" | "phone" | "chat";
  }) {
    return this.wholesale.submitRfq(data);
  }

  @Post("cart/add")
  @UseGuards(AgentAuthGuard)
  addToCart(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { supplierItemId: string; variantId?: string; quantity: number }
  ) {
    return this.wholesale.addToCart(authorization, body);
  }

  @Post("orders/start")
  @UseGuards(AgentAuthGuard)
  startOrder(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { supplierItemId: string; variantId?: string; quantity: number }
  ) {
    return this.wholesale.startOrder(authorization, body);
  }
}
