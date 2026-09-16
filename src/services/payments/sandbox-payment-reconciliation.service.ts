import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
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

  async confirm(transactionId: string, reason: string, actor: { userId?: number; orgId?: number }) {
    if (process.env.NODE_ENV === 'production' || process.env.SANDBOX_SETTLEMENT_MODE !== 'true') {
      throw new ForbiddenException('Sandbox payment settlement is disabled.');
    }
    if (typeof reason !== 'string' || !reason.trim()) throw new BadRequestException('A sandbox confirmation reason is required.');

    if (!Number.isInteger(actor.userId) || Number(actor.userId) < 1 || !Number.isInteger(actor.orgId) || Number(actor.orgId) < 0) {
      throw new BadRequestException('Authenticated sandbox administrator identity is required.');
    }

    const payment = await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: transactionId } });
    if (payment.provider !== PaymentGatewayProvider.PAYMAYA || payment.environment !== 'SANDBOX') {
      throw new BadRequestException('Only reconciliation-required Maya sandbox payments may be confirmed.');
    }

    const snapshot = (payment.feeSnapshot ?? {}) as Record<string, any>;
    const evidence = snapshot.sandboxWebhookEvidence as Record<string, unknown> | undefined;
    const verification = snapshot.providerVerification as Record<string, unknown> | undefined;
    const amount = Number(evidence?.amount);
    const occurredAt = new Date(String(evidence?.receivedAt));
    if (
      !evidence ||
      evidence.status !== 'PAYMENT_SUCCESS' ||
      evidence.isPaid !== true ||
      evidence.requestReferenceNumber !== payment.id ||
      evidence.providerReference !== payment.gatewayReference ||
      !payment.gatewayReference ||
      !Number.isFinite(amount) ||
      Math.abs(amount - payment.amount) > 0.009 ||
      !Number.isFinite(occurredAt.getTime()) ||
      evidence.currency !== 'PHP' ||
      verification?.result !== 'UNAVAILABLE' ||
      verification?.providerCode !== 'K007'
    ) {
      throw new BadRequestException('Persisted Maya sandbox webhook evidence does not match this payment transaction.');
    }
    if (payment.status === 'SUCCEEDED') {
      if (!(snapshot.sandboxReconciliationAudit as Record<string, unknown> | undefined)?.confirmed) {
        throw new BadRequestException('This payment was not confirmed through sandbox reconciliation.');
      }
      return { payment, alreadyConfirmed: true };
    }
    if (payment.status !== 'RECONCILIATION_REQUIRED') {
      throw new BadRequestException('Only reconciliation-required Maya sandbox payments may be confirmed.');
    }

    const confirmedAt = new Date().toISOString();

    const event: NormalizedProviderEvent = {
      provider: PaymentGatewayProvider.PAYMAYA,
      eventId: String(snapshot.providerEventId ?? payment.gatewayReference),
      providerReference: payment.gatewayReference,
      status: 'SUCCEEDED',
      amount,
      currency: 'PHP',
      occurredAt,
      metadata: {
        sandboxReconciliation: true,
        sandboxReconciliationAudit: {
          confirmed: true,
          actorUserId: Number(actor.userId),
          actorOrgId: Number(actor.orgId),
          reason: reason.trim(),
          confirmedAt,
          paymentTransactionId: payment.id,
          environment: payment.environment,
          evidence: {
            status: evidence.status,
            isPaid: evidence.isPaid,
            requestReferenceNumber: evidence.requestReferenceNumber,
            providerReference: evidence.providerReference,
            amount,
            currency: evidence.currency,
            receivedAt: evidence.receivedAt,
            providerVerification: {
              result: verification.result,
              httpStatus: verification.httpStatus,
              providerCode: verification.providerCode,
            },
          },
        },
      },
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
      throw new UnauthorizedException('Sandbox reconciliation service credential was rejected.');
    }
  }
}
