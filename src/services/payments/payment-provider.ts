export type NormalizedPaymentStatus = 'AWAITING_PAYMENT' | 'PROCESSING' | 'RECONCILIATION_REQUIRED' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
export type CreatePaymentCheckoutInput = { transactionId: string; poNumber: string; amount: number; successUrl: string; cancelUrl: string };
export type CreatePaymentCheckoutResult = { providerReference: string; checkoutUrl: string; rawMetadata: Record<string, unknown> };
import { PaymentGatewayProvider } from '../../generated/prisma/client';
export type NormalizedProviderEvent = { provider: PaymentGatewayProvider; eventId: string; providerReference: string; status: NormalizedPaymentStatus; amount: number; currency: string; occurredAt: Date; metadata: Record<string, unknown> };
export interface PaymentProvider { provider: PaymentGatewayProvider; createCheckout(input: CreatePaymentCheckoutInput): Promise<CreatePaymentCheckoutResult>; processWebhook(payload: unknown): Promise<NormalizedProviderEvent>; getPaymentStatus(reference: string): Promise<NormalizedProviderEvent>; }
