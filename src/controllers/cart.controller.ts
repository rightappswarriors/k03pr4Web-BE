import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { parsePositiveId } from "../common/validation";
import { CartService } from "../services/cart.service";

@Controller()
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Get("cart")
  cart(@Headers("authorization") authorization?: string) {
    return this.cartService.cart(authorization);
  }

  @Post("cart/add")
  addToCart(@Headers("authorization") authorization: string | undefined, @Body() body: unknown) {
    return this.cartService.addToCart(authorization, body);
  }

  @Patch("cart/item/:id")
  updateCartItem(@Headers("authorization") authorization: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    return this.cartService.updateCartItem(authorization, parsePositiveId(id), body);
  }

  @Delete("cart/item/:id/delete")
  removeCartItem(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    return this.cartService.removeCartItem(authorization, parsePositiveId(id));
  }

  @Get("cart/item/:id/outlets")
  getCartItemOutlets(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    return this.cartService.getCartItemOutlets(authorization, parsePositiveId(id));
  }

  @Patch("cart/item/:id/outlet")
  switchCartItemOutlet(@Headers("authorization") authorization: string | undefined, @Param("id") id: string, @Body() body: unknown) {
    return this.cartService.switchCartItemOutlet(authorization, parsePositiveId(id), body);
  }
}
