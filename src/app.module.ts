import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AddressController } from "./controllers/address.controller";
import { AuthController } from "./controllers/auth.controller";
import { AgentController } from "./controllers/agent.controller";
import { CartController } from "./controllers/cart.controller";
import { CatalogController } from "./controllers/catalog.controller";
import { NotificationController } from "./controllers/notification.controller";
import { OrderController } from "./controllers/order.controller";
<<<<<<< HEAD
import { OutletController } from "./controllers/outlet.controller";
import { SearchController } from "./controllers/search.controller";
import { WholesaleController } from "./controllers/wholesale.controller";
=======
import { WholesaleController } from "./controllers/wholesale.controller";
import { SupplierController } from "./controllers/supplier.controller";
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
import { AgentAuthGuard } from "./guards/agent-auth.guard";
import { CacheService } from "./common/cache.service";
import { AddressService } from "./services/address.service";
import { AgentService } from "./services/agent.service";
import { AuthService } from "./services/auth.service";
import { CartService } from "./services/cart.service";
import { CatalogService } from "./services/catalog.service";
import { CustomerAuthService } from "./services/customer-auth.service";
import { DatabaseService } from "./services/database.service";
import { EmailService } from "./services/email.service";
import { NotificationService } from "./services/notification.service";
import { OrderService } from "./services/order.service";
<<<<<<< HEAD
import { OutletService } from "./services/outlet.service";
import { PrismaService } from "./services/prisma.service";
import { SearchService } from "./services/search.service";
import { WholesaleService } from "./services/wholesale.service";
=======
import { DashboardService } from "./services/dashboard.service";
import { RfqService } from "./services/rfq.service";
import { ConversationService } from "./services/conversation.service";
import { RfqNegotiationService } from "./services/rfqNegotiation.service";
import { WholesaleService } from "./services/wholesale.service";
import { PrismaService } from "./services/prisma.service";
import { RealtimeGateway } from "./gateway/realtime.gateway";
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)

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
    AgentController,
    AuthController,
    CartController,
<<<<<<< HEAD
    OutletController,
    CatalogController,
    NotificationController,
    OrderController,
    SearchController,
    WholesaleController,
=======
    CatalogController,
    NotificationController,
    OrderController,
    WholesaleController,
    SupplierController,
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    AddressService,
    AgentService,
    AuthService,
    CacheService,
    CartService,
    CatalogService,
    CustomerAuthService,
    DatabaseService,
    EmailService,
    NotificationService,
<<<<<<< HEAD
    OrderService,
    OutletService,
    PrismaService,
    SearchService,
    WholesaleService,
    AgentAuthGuard,
  ],
})
export class AppModule { }
=======
    DashboardService,
    OrderService,
    RfqService,
    ConversationService,
    RfqNegotiationService,
    WholesaleService,
    PrismaService,
    RealtimeGateway,
    AgentAuthGuard,
  ],
})
export class AppModule {}
>>>>>>> 60f5dc1 (chat system merging with prasmo's work)
