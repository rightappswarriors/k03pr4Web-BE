import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PaymentGatewayProvider } from '../../generated/prisma/client';
import { MayaPaymentProvider } from './maya-payment.provider';
@Injectable() export class PaymentProviderRegistry {
  constructor(private readonly maya: MayaPaymentProvider) {}
  resolve(provider: PaymentGatewayProvider) { if (provider === PaymentGatewayProvider.PAYMAYA) return this.maya; throw new ServiceUnavailableException(`Unsupported payment provider: ${provider}`); }
  defaultProvider(): PaymentGatewayProvider {
    const configured = (process.env.PAYMENT_PROVIDER || PaymentGatewayProvider.PAYMAYA).toUpperCase();
    // MAYA is accepted only as a configuration alias; no database value uses it.
    if (configured === 'MAYA' || configured === PaymentGatewayProvider.PAYMAYA) return PaymentGatewayProvider.PAYMAYA;
    throw new ServiceUnavailableException(`Unsupported PAYMENT_PROVIDER configuration: ${configured}`);
  }
}
