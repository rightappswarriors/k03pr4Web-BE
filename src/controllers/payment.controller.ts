import { Body, Controller, Get, Headers, Param, Post, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { PaymentProviderRegistry } from '../services/payments/payment-provider.registry';
import { PaymentConfirmationService } from '../services/payments/payment-confirmation.service';
import { PurchaseOrderPaymentService } from '../services/purchase-order-payment.service';
import { SandboxPaymentReconciliationService } from '../services/payments/sandbox-payment-reconciliation.service';
import { PaymentGatewayProvider } from '../generated/prisma/client';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: PaymentProviderRegistry,
    private readonly confirmation: PaymentConfirmationService,
    private readonly purchaseOrderPayment: PurchaseOrderPaymentService,
    private readonly sandboxReconciliation: SandboxPaymentReconciliationService,
  ) {}

  @Get(':id')
  async status(@Param('id') id: string) {
    const payment = await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id } });
    return { success: true, data: { id: payment.id, status: payment.status, amount: payment.amount, provider: payment.provider, reference: payment.gatewayReference } };
  }

  @Post('admin/sandbox-reconciliation/:id/confirm')
  async confirmSandboxPayment(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Headers('x-sandbox-settlement-key') key?: string,
  ) {
    this.sandboxReconciliation.assertInternalAccess(key);
    const result = await this.sandboxReconciliation.confirm(id, body?.reason ?? '');
    return { success: true, data: { id: result.payment.id, status: result.payment.status, alreadyConfirmed: result.alreadyConfirmed } };
  }

  @Post('admin/sandbox-reconciliation/:id/backfill')
  async backfillSandboxPayment(
    @Param('id') id: string,
    @Headers('x-sandbox-settlement-key') key?: string,
  ) {
    this.sandboxReconciliation.assertInternalAccess(key);
    const result = await this.sandboxReconciliation.backfillReconciliationRequired(id);
    return { success: true, data: { id: result.payment.id, status: result.payment.status, transitioned: result.transitioned, reason: result.reason ?? null } };
  }

  @Post('webhook/maya')
  async mayaWebhook(@Body() payload: unknown) {
    const trace = (step: number, details: Record<string, unknown>) => {
      if (process.env.NODE_ENV === 'development') console.info(`[MAYA-${step}]`, details);
    };
    trace(1, { received: true });
    const provider = this.providers.resolve(PaymentGatewayProvider.PAYMAYA);
    const event = await provider.processWebhook(payload);
    const metadata = event.metadata as Record<string, any>;
    const requestReferenceNumber = this.optionalReference(metadata.requestReferenceNumber ?? metadata.metadata?.requestReferenceNumber);
    const providerReference = this.optionalReference(event.providerReference);
    trace(2, { normalizedStatus: event.status, providerStatus: metadata.paymentStatus ?? metadata.status ?? null });
    trace(3, { isPaid: metadata.isPaid === true });
    trace(4, { requestReferenceNumber: requestReferenceNumber ?? null });
    trace(5, { providerReference: providerReference ?? null });

    if (process.env.NODE_ENV === 'development') console.info('[Maya webhook received]', {
      eventStatus: metadata.paymentStatus ?? metadata.status,
      checkoutOrPaymentId: providerReference,
      requestReferenceNumber,
      amount: event.amount,
      currency: event.currency,
    });

    const byRequestReference = requestReferenceNumber
      ? await this.prisma.paymentTransaction.findFirst({ where: { id: requestReferenceNumber, provider: PaymentGatewayProvider.PAYMAYA, deletedAt: null } })
      : null;
    const byProviderReference = providerReference
      ? await this.prisma.paymentTransaction.findFirst({ where: { gatewayReference: providerReference, provider: PaymentGatewayProvider.PAYMAYA, deletedAt: null } })
      : null;
    if (byRequestReference && byProviderReference && byRequestReference.id !== byProviderReference.id) {
      throw new ServiceUnavailableException('Maya webhook references conflicting payment transactions.');
    }
    const payment = byRequestReference ?? byProviderReference;
    trace(6, { paymentTransactionId: payment?.id ?? null });

    if (process.env.NODE_ENV === 'development') console.info('[Maya webhook correlation]', {
      requestReferenceNumber,
      checkoutOrPaymentId: providerReference,
      matchedPaymentTransactionId: payment?.id,
    });
    if (!payment) return { received: true, ignored: true };
    if (payment.status === 'SUCCEEDED') {
      if (process.env.NODE_ENV === 'development') console.info('[Maya webhook confirmation]', { transactionId: payment.id, result: 'already-confirmed' });
      return { received: true, idempotent: true };
    }
    if (!payment.gatewayReference || payment.gatewayReference !== providerReference) {
      trace(12, { intendedStatus: 'NONE', reason: 'provider-reference-mismatch' });
      throw new ServiceUnavailableException('Maya webhook provider reference does not match its payment transaction.');
    }
    const amountMatches = Math.abs(event.amount - payment.amount) <= 0.009;
    const currencyMatches = event.currency === 'PHP';
    trace(7, { amountMatches });
    trace(8, { currencyMatches });

    if (event.status === 'FAILED' || event.status === 'CANCELLED' || event.status === 'EXPIRED') {
      trace(12, { intendedStatus: event.status });
      await this.purchaseOrderPayment.recordWebhookOutcome(payment, event);
      const updated = await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: payment.id } });
      trace(13, { transactionId: updated.id, status: updated.status });
      trace(14, { transactionId: updated.id, evidencePresent: Boolean((updated.feeSnapshot as any)?.sandboxWebhookEvidence), verificationPresent: Boolean((updated.feeSnapshot as any)?.providerVerification) });
      trace(15, { finalStatus: updated.status });
      return { received: true, terminal: event.status };
    }

    const isMatchingSuccessWebhook =
      payment.provider === PaymentGatewayProvider.PAYMAYA && payment.environment === 'SANDBOX' && event.status === 'SUCCEEDED' && metadata.isPaid === true &&
      requestReferenceNumber === payment.id && amountMatches && currencyMatches;
    if (isMatchingSuccessWebhook) {
      const persisted = await this.purchaseOrderPayment.recordWebhookSuccessEvidence(payment, event);
      trace(9, { transactionId: persisted.id, evidencePresent: Boolean((persisted.feeSnapshot as any)?.sandboxWebhookEvidence) });
    }

    try {
      trace(10, { transactionId: payment.id });
      const verified = await provider.getPaymentStatus(payment.gatewayReference);
      if (process.env.NODE_ENV === 'development') console.info('[Maya provider verification]', {
        transactionId: payment.id,
        providerStatus: verified.status,
        checkoutOrPaymentId: verified.providerReference,
        amount: verified.amount,
        currency: verified.currency,
      });
      if (verified.providerReference !== payment.gatewayReference) {
        throw new ServiceUnavailableException('Maya verification returned a different payment reference.');
      }
      if (verified.status === 'SUCCEEDED') {
        trace(11, { verificationStatus: verified.status, providerCode: null });
        trace(12, { intendedStatus: 'SUCCEEDED' });
        const result = await this.confirmation.confirmPaymentTransaction(payment.id, verified);
        trace(13, { transactionId: result.id, status: result.status });
        trace(14, { transactionId: result.id, evidencePresent: Boolean((result.feeSnapshot as any)?.sandboxWebhookEvidence), verificationPresent: Boolean((result.feeSnapshot as any)?.providerVerification) });
        trace(15, { finalStatus: result.status });
        if (process.env.NODE_ENV === 'development') console.info('[Maya webhook confirmation]', { transactionId: result.id, result: 'confirmed' });
      } else if (verified.status === 'FAILED' || verified.status === 'CANCELLED' || verified.status === 'EXPIRED') {
        trace(11, { verificationStatus: verified.status, providerCode: null });
        trace(12, { intendedStatus: verified.status });
        await this.purchaseOrderPayment.recordWebhookOutcome(payment, verified);
        const updated = await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: payment.id } });
        trace(13, { transactionId: updated.id, status: updated.status });
        trace(15, { finalStatus: updated.status });
      } else {
        trace(11, { verificationStatus: verified.status, providerCode: null });
        trace(12, { intendedStatus: 'PROCESSING', reason: 'provider-outcome-unresolved' });
      }
      return { received: true };
    } catch (error) {
      const diagnostic = (error as any)?.mayaDiagnostic;
      trace(11, { verificationStatus: 'UNAVAILABLE', providerCode: diagnostic?.providerCode ?? null, httpStatus: diagnostic?.httpStatus ?? null });
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Maya provider verification failed]', { transactionId: payment.id, httpStatus: diagnostic?.httpStatus, providerCode: diagnostic?.providerCode });
      }
      const isMatchingSandboxSuccess =
        payment.provider === PaymentGatewayProvider.PAYMAYA &&
        payment.environment === 'SANDBOX' &&
        payment.status === 'PROCESSING' &&
        event.status === 'SUCCEEDED' &&
        metadata.isPaid === true &&
        requestReferenceNumber === payment.id &&
        providerReference === payment.gatewayReference &&
        Math.abs(event.amount - payment.amount) <= 0.009 &&
        event.currency === 'PHP';
      if (isMatchingSandboxSuccess && diagnostic?.providerCode === 'K007') {
        trace(12, { intendedStatus: 'RECONCILIATION_REQUIRED' });
        await this.purchaseOrderPayment.recordWebhookOutcome(payment, event, {
          providerCode: diagnostic?.providerCode,
          httpStatus: diagnostic?.httpStatus,
        });
        const updated = await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: payment.id } });
        trace(13, { transactionId: updated.id, status: updated.status });
        trace(14, { transactionId: updated.id, evidencePresent: Boolean((updated.feeSnapshot as any)?.sandboxWebhookEvidence), verificationPresent: Boolean((updated.feeSnapshot as any)?.providerVerification) });
        trace(15, { finalStatus: updated.status });
        return { received: true, reconciliationRequired: true };
      }
      throw error;
    }
  }

  private optionalReference(value: unknown) {
    const reference = typeof value === 'string' ? value.trim() : '';
    return reference || undefined;
  }
}
