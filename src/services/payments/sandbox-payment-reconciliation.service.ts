import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PaymentGatewayProvider } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { PaymentConfirmationService } from './payment-confirmation.service';
import { NormalizedProviderEvent } from './payment-provider';

@Injectable()
export class SandboxPaymentReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly confirmation: PaymentConfirmationService,
  ) {}

  async confirm(transactionId: string, reason: string) {
    if (process.env.NODE_ENV === 'production' || process.env.SANDBOX_SETTLEMENT_MODE !== 'true') {
      throw new ForbiddenException('Sandbox payment settlement is disabled.');
    }
    if (!reason.trim()) throw new BadRequestException('A sandbox confirmation reason is required.');

    const payment = await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: transactionId } });
    if (payment.status === 'SUCCEEDED') return { payment, alreadyConfirmed: true };
    if (payment.provider !== PaymentGatewayProvider.PAYMAYA || payment.environment !== 'SANDBOX' || payment.status !== 'RECONCILIATION_REQUIRED') {
      throw new BadRequestException('Only reconciliation-required Maya sandbox payments may be confirmed.');
    }

    const snapshot = (payment.feeSnapshot ?? {}) as Record<string, any>;
    const evidence = snapshot.sandboxWebhookEvidence as Record<string, unknown> | undefined;
    const amount = Number(evidence?.amount);
    if (
      !evidence ||
      evidence.status !== 'PAYMENT_SUCCESS' ||
      evidence.isPaid !== true ||
      evidence.requestReferenceNumber !== payment.id ||
      evidence.providerReference !== payment.gatewayReference ||
      !payment.gatewayReference ||
      !Number.isFinite(amount) ||
      Math.abs(amount - payment.amount) > 0.009 ||
      evidence.currency !== 'PHP'
    ) {
      throw new BadRequestException('Persisted Maya sandbox webhook evidence does not match this payment transaction.');
    }

    const event: NormalizedProviderEvent = {
      provider: PaymentGatewayProvider.PAYMAYA,
      eventId: String(snapshot.providerEventId ?? payment.gatewayReference),
      providerReference: payment.gatewayReference,
      status: 'SUCCEEDED',
      amount,
      currency: 'PHP',
      occurredAt: new Date(String(evidence.receivedAt)),
      metadata: { sandboxReconciliation: true, reason: reason.trim() },
    };
    return { payment: await this.confirmation.confirmPaymentTransaction(payment.id, event), alreadyConfirmed: false };
  }

  async backfillReconciliationRequired(transactionId: string) {
    if (process.env.NODE_ENV === 'production' || process.env.SANDBOX_SETTLEMENT_MODE !== 'true') {
      throw new ForbiddenException('Sandbox payment settlement is disabled.');
    }
    const payment = await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: transactionId } });
    if (payment.status !== 'PROCESSING') return { payment, transitioned: false, reason: 'Payment is not processing.' };
    const snapshot = (payment.feeSnapshot ?? {}) as Record<string, any>;
    const evidence = snapshot.sandboxWebhookEvidence as Record<string, unknown> | undefined;
    const amount = Number(evidence?.amount);
    const isMatchingSuccessEvidence =
      payment.provider === PaymentGatewayProvider.PAYMAYA &&
      payment.environment === 'SANDBOX' &&
      evidence?.status === 'PAYMENT_SUCCESS' &&
      evidence.isPaid === true &&
      evidence.requestReferenceNumber === payment.id &&
      evidence.providerReference === payment.gatewayReference &&
      Boolean(payment.gatewayReference) &&
      Number.isFinite(amount) && Math.abs(amount - payment.amount) <= 0.009 &&
      evidence.currency === 'PHP' &&
      snapshot.providerVerification?.providerCode === 'K007';
    if (!isMatchingSuccessEvidence) return { payment, transitioned: false, reason: 'Matching persisted Maya PAYMENT_SUCCESS evidence with K007 was not found.' };

    await this.prisma.paymentTransaction.updateMany({
      where: { id: payment.id, status: 'PROCESSING' },
      data: { status: 'RECONCILIATION_REQUIRED', feeSnapshot: { ...snapshot, reconciliationRequiredAt: new Date().toISOString(), reconciliationBackfilledAt: new Date().toISOString() } },
    });
    return { payment: await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: payment.id } }), transitioned: true };
  }

  assertInternalAccess(key: string | undefined) {
    const expected = process.env.SANDBOX_SETTLEMENT_SERVICE_KEY;
    if (!expected || !key || key !== expected) {
      throw new ServiceUnavailableException('Sandbox reconciliation service access is not configured.');
    }
  }
}
