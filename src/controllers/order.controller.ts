import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { parsePositiveId } from "../common/validation";
import { OrderService } from "../services/order.service";

@Controller()
export class OrderController {
  constructor(private readonly ordersService: OrderService) {}

  @Post("checkout")
  checkout(@Headers("authorization") authorization: string | undefined, @Body() body: unknown) {
    return this.ordersService.checkout(authorization, body);
  }

  @Get("orders")
  orders(@Headers("authorization") authorization?: string) {
    return this.ordersService.orders(authorization);
  }

  @Get("orders/:id")
  order(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    return this.ordersService.order(authorization, parsePositiveId(id));
  }

  @Post("orders/:id/cancel")
  cancelOrder(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    return this.ordersService.cancelOrder(authorization, parsePositiveId(id));
  }
}
