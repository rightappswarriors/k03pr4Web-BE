import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CreatePaymentCheckoutInput, CreatePaymentCheckoutResult, NormalizedProviderEvent, PaymentProvider } from './payment-provider';
import { PaymentGatewayProvider } from '../../generated/prisma/client';

@Injectable()
export class MayaPaymentProvider implements PaymentProvider {
  readonly provider = PaymentGatewayProvider.PAYMAYA;

  private get host() {
    return process.env.PAYMENT_ENV === 'PRODUCTION' ? 'https://pg.maya.ph' : 'https://pg-sandbox.paymaya.com';
  }

  private publicKey() {
    const key = process.env.MAYA_PUBLIC_KEY;
    if (!key) throw new ServiceUnavailableException('Maya sandbox payment is not configured.');
    return key;
  }

  private urls() {
    const successUrl = process.env.MAYA_SUCCESS_URL;
    const cancelUrl = process.env.MAYA_CANCEL_URL;
    if (!successUrl || !cancelUrl) throw new ServiceUnavailableException('Maya sandbox payment return URLs are not configured.');
    return { successUrl, cancelUrl };
  }

  async createCheckout(input: CreatePaymentCheckoutInput): Promise<CreatePaymentCheckoutResult> {
    this.urls();
    const response = await fetch(`${this.host}/checkout/v1/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.publicKey()}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        totalAmount: { value: Math.round(input.amount * 100) / 100, currency: 'PHP' },
        buyer: {},
        items: [{ name: `Purchase Order ${input.poNumber}`, quantity: 1, totalAmount: { value: Math.round(input.amount * 100) / 100, currency: 'PHP' } }],
        requestReferenceNumber: input.transactionId,
        redirectUrl: { success: input.successUrl, failure: input.cancelUrl, cancel: input.cancelUrl },
      }),
    });
    const body: any = await response.json();
    if (!response.ok || !body.checkoutId || !body.redirectUrl) throw new BadRequestException(body?.message || 'Maya Checkout could not be created.');
    return {
      providerReference: body.checkoutId,
      checkoutUrl: body.redirectUrl,
      rawMetadata: { checkoutId: body.checkoutId, requestReferenceNumber: input.transactionId },
    };
  }

  async getPaymentStatus(reference: string): Promise<NormalizedProviderEvent> {
    const response = await fetch(`${this.host}/payments/v1/payments/${encodeURIComponent(reference)}/status`, {
      headers: { Authorization: `Basic ${Buffer.from(`${this.publicKey()}:`).toString('base64')}` },
    });
    const body: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new ServiceUnavailableException('Maya payment verification was unavailable.');
      (error as any).mayaDiagnostic = { httpStatus: response.status, providerCode: body?.code };
      throw error;
    }
    return this.normalize(body);
  }

  async processWebhook(payload: unknown): Promise<NormalizedProviderEvent> {
    return this.normalize(payload as Record<string, unknown>);
  }

  private normalize(body: any): NormalizedProviderEvent {
    const providerStatus = String(body.paymentStatus ?? body.status ?? '').toUpperCase();
    const status = body.isPaid === true || providerStatus === 'PAYMENT_SUCCESS' || providerStatus.includes('SUCCESS')
      ? 'SUCCEEDED'
      : providerStatus.includes('EXPIRED') || providerStatus.includes('DROPOUT')
        ? 'EXPIRED'
        : providerStatus.includes('CANCEL')
        ? 'CANCELLED'
        : providerStatus.includes('FAIL')
          ? 'FAILED'
          : providerStatus.includes('PROCESS')
            ? 'PROCESSING'
            : 'AWAITING_PAYMENT';
    return {
      provider: PaymentGatewayProvider.PAYMAYA,
      eventId: String(body.id ?? body.paymentId ?? body.checkoutId ?? ''),
      // Payment Checkout creates and stores `checkoutId`. Webhook payloads can
      // also contain a separate payment `id`, which must not replace the
      // checkout correlation reference.
      providerReference: String(body.checkoutId ?? body.paymentId ?? body.id ?? ''),
      status,
      amount: Number(body.totalAmount?.value ?? body.amount?.value ?? body.amount ?? 0),
      currency: String(body.totalAmount?.currency ?? body.amount?.currency ?? body.currency ?? 'PHP'),
      occurredAt: new Date(body.updatedAt ?? body.createdAt ?? Date.now()),
      metadata: body,
    };
  }
}
