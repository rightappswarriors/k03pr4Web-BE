import { Controller, Get, Param, Post, Body, Query, Headers, Req } from "@nestjs/common";
import { WholesaleService } from "../services/wholesale.service";

@Controller("wholesale")
export class WholesaleController {
  constructor(private readonly wholesale: WholesaleService) { }

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
  @Get("quotes")
  quotes() {
    return this.wholesale.quotes();
  }

  // =====================
  // Wholesale Cart/Order Endpoints
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

  @Post("cart/add")
  addToCart(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { supplierItemId: string; variantId?: string; quantity: number }
  ) {
    return this.wholesale.addToCart(authorization, body);
  }

  @Post("orders/start")
  startOrder(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { supplierItemId: string; variantId?: string; quantity: number }
  ) {
    return this.wholesale.startOrder(authorization, body);
  }
}