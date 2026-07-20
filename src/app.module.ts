import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AddressController } from "./controllers/address.controller";
import { AuthController } from "./controllers/auth.controller";
import { CartController } from "./controllers/cart.controller";
import { CatalogController } from "./controllers/catalog.controller";
import { NotificationController } from "./controllers/notification.controller";
import { OrderController } from "./controllers/order.controller";
import { WholesaleController } from "./controllers/wholesale.controller";
import { CacheService } from "./common/cache.service";
import { AddressService } from "./services/address.service";
import { AuthService } from "./services/auth.service";
import { CartService } from "./services/cart.service";
import { CatalogService } from "./services/catalog.service";
import { CustomerAuthService } from "./services/customer-auth.service";
import { DatabaseService } from "./services/database.service";
import { EmailService } from "./services/email.service";
import { NotificationService } from "./services/notification.service";
import { OrderService } from "./services/order.service";
import { WholesaleService } from "./services/wholesale.service";
import { PrismaService } from "./services/prisma.service";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_TTL_MS || 1_000),
        limit: Number(process.env.RATE_LIMIT_MAX || 20),
      },
    ]),
  ],
  controllers: [
    AddressController,
    AuthController,
    CartController,
    CatalogController,
    NotificationController,
    OrderController,
    WholesaleController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    AddressService,
    AuthService,
    CacheService,
    CartService,
    CatalogService,
    CustomerAuthService,
    DatabaseService,
    EmailService,
    NotificationService,
    OrderService,
    WholesaleService,
    PrismaService,
  ],
})
export class AppModule {}
