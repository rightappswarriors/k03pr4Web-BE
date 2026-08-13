import { Controller, Get, Param, Post, Body, Query, Headers, Req, UseGuards } from "@nestjs/common";
import { WholesaleService } from "../services/wholesale.service";
import { AgentAuthGuard } from "../guards/agent-auth.guard";

@Controller("wholesale")
<<<<<<< HEAD
@UseGuards(AgentAuthGuard)
export class WholesaleController {
  constructor(private readonly wholesale: WholesaleService) { }

=======
export class WholesaleController {
  constructor(private readonly wholesale: WholesaleService) { }

  // Public marketplace endpoints — no agent auth required
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
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

  @Get("products/:id")
  product(@Param("id") id: string) {
    return this.wholesale.product(id);
  }

<<<<<<< HEAD
  @Post("rfq")
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
=======
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
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

  @Get("products/by-ids")
  productsByIds(@Query("ids") ids: string) {
    return this.wholesale.productsByIds(ids ? ids.split(",") : []);
  }
<<<<<<< HEAD
=======

>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
  @Get("quotes")
  quotes() {
    return this.wholesale.quotes();
  }

  // =====================
<<<<<<< HEAD
  // Wholesale Cart/Order Endpoints
=======
  // Public pricing endpoints
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
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

<<<<<<< HEAD
  @Post("cart/add")
=======
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
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
  addToCart(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { supplierItemId: string; variantId?: string; quantity: number }
  ) {
    return this.wholesale.addToCart(authorization, body);
  }

  @Post("orders/start")
<<<<<<< HEAD
=======
  @UseGuards(AgentAuthGuard)
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
  startOrder(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { supplierItemId: string; variantId?: string; quantity: number }
  ) {
    return this.wholesale.startOrder(authorization, body);
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
