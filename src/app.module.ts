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
import { WholesaleController } from "./controllers/wholesale.controller";
import { SupplierController } from "./controllers/supplier.controller";
import { PaymentController } from './controllers/payment.controller';
import { AgentAuthGuard } from "./guards/agent-auth.guard";
import { SupplierAuthGuard } from "./guards/supplier-auth.guard";
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
import { DashboardService } from "./services/dashboard.service";
import { RfqService } from "./services/rfq.service";
import { ConversationService } from "./services/conversation.service";
import { RfqNegotiationService } from "./services/rfqNegotiation.service";
import { WholesaleService } from "./services/wholesale.service";
import { PrismaService } from "./services/prisma.service";
import { RealtimeGateway } from "./gateway/realtime.gateway";
import { PurchaseOrderPaymentService } from "./services/purchase-order-payment.service";
import { MayaPaymentProvider } from './services/payments/maya-payment.provider';
import { PaymentProviderRegistry } from './services/payments/payment-provider.registry';
import { PaymentConfirmationService } from './services/payments/payment-confirmation.service';
import { SandboxPaymentReconciliationService } from './services/payments/sandbox-payment-reconciliation.service';

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
    CatalogController,
    NotificationController,
    OrderController,
    WholesaleController,
    SupplierController,
    PaymentController,
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
    DashboardService,
    OrderService,
    RfqService,
    ConversationService,
    RfqNegotiationService,
    PurchaseOrderPaymentService,
    MayaPaymentProvider,
    PaymentProviderRegistry,
    PaymentConfirmationService,
    SandboxPaymentReconciliationService,
    WholesaleService,
    PrismaService,
    RealtimeGateway,
    AgentAuthGuard,
    SupplierAuthGuard,
  ],
})
export class AppModule {}
