import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from './prisma.service';
import { PaymentProviderRegistry } from './payments/payment-provider.registry';
import { PaymentConfirmationService } from './payments/payment-confirmation.service';
import { PaymentGatewayProvider } from '../generated/prisma/client';

const OPEN_ATTEMPT_STATUSES = ['PENDING', 'AWAITING_PAYMENT', 'PROCESSING', 'RECONCILIATION_REQUIRED'] as const;
const TERMINAL_ATTEMPT_STATUSES = ['FAILED', 'CANCELLED', 'EXPIRED'] as const;
const CHECKOUT_SESSION_LIFETIME_MS = 60 * 60 * 1000;
const CHECKOUT_REUSE_WINDOW_MS = Math.min(
  CHECKOUT_SESSION_LIFETIME_MS,
  Math.max(0, Number(process.env.MAYA_CHECKOUT_REUSE_MINUTES ?? 55) * 60 * 1000),
);

/**
 * Owns provider payment attempts for a Purchase Order.  PO.paymentStatus means
 * commercial payment preparation; PaymentTransaction is the provider-attempt
 * lifecycle and may therefore have several terminal attempts for one PO.
 */
@Injectable()
export class PurchaseOrderPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: PaymentProviderRegistry,
    private readonly confirmation: PaymentConfirmationService,
  ) {}

  async createForPurchaseOrder(poId: string, agentId: string): Promise<any> {
    let attempt: any;
    let created = false;

    try {
      const outcome = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${poId} FOR UPDATE`;
        const po = await tx.purchaseOrder.findUnique({
          where: { id: poId },
          include: { POLineItem: { include: { SupplierItem: { select: { categoryId: true, unit: true } } } } },
        });
        if (!po || po.agentId !== agentId) {
          throw new BadRequestException({ error: 'Prepare payment for an accepted purchase order first.' });
        }
        if (po.paymentStatus === 'PAID') throw new BadRequestException({ error: 'This purchase order already has a confirmed payment.' });
        if (po.supplierConfirmation !== 'CONFIRMED' || po.paymentStatus !== 'PREPARING') {
          throw new BadRequestException({ error: 'Prepare payment for an accepted purchase order first.' });
        }
        if (po.source === 'DIRECT_ORDER' && po.deliveryDateAgreementStatus !== 'AGREED') {
          const existingAttempt = await tx.paymentTransaction.findFirst({
            where: { relatedType: 'PURCHASE_ORDER', relatedId: po.id, status: { in: [...OPEN_ATTEMPT_STATUSES] }, deletedAt: null },
            orderBy: { createdAt: 'desc' },
          });
          if (existingAttempt) return { attempt: existingAttempt, created: false };
          throw new BadRequestException({ error: 'Agree on the delivery schedule with the Supplier before starting payment.' });
        }
        const confirmed = await tx.paymentTransaction.findFirst({
          where: { relatedType: 'PURCHASE_ORDER', relatedId: po.id, status: 'SUCCEEDED', deletedAt: null },
        });
        if (confirmed) throw new BadRequestException({ error: 'This purchase order already has a confirmed payment.' });

        const active = await tx.paymentTransaction.findFirst({
          where: { relatedType: 'PURCHASE_ORDER', relatedId: po.id, status: { in: [...OPEN_ATTEMPT_STATUSES] }, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        });
        if (active) return { attempt: active, created: false };

        this.assertConsistentCommercialSnapshot(po);
        const now = new Date();
        const categoryIds = [...new Set(po.POLineItem.map((line) => line.SupplierItem.categoryId).filter(Boolean))] as string[];
        const units = [...new Set(po.POLineItem.map((line) => line.SupplierItem.unit).filter(Boolean))];
        const rules = await tx.feeRule.findMany({
          where: {
            appliesTo: 'PURCHASE_ORDER', isActive: true, deletedAt: null, effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
          },
        });
        const rule = rules.sort((a, b) => {
          const score = (item: typeof a) => (item.category && categoryIds.includes(item.category) ? 2 : 0) + (item.unitType && units.includes(item.unitType) ? 2 : 0) - (item.category && !categoryIds.includes(item.category) ? 10 : 0) - (item.unitType && !units.includes(item.unitType) ? 10 : 0);
          return score(b) - score(a) || b.effectiveFrom.getTime() - a.effectiveFrom.getTime();
        })[0];
        const applicableQty = po.POLineItem.filter((line) => !rule?.unitType || line.SupplierItem.unit === rule.unitType).reduce((sum, line) => sum + line.qty, 0);
        const grossAmount = Number(po.totalAmount);
        const platformFee = !rule ? 0 : rule.rateType === 'PERCENTAGE'
          ? grossAmount * rule.rate
          : rule.rateType === 'PER_UNIT' ? applicableQty * rule.rate : rule.rate;
        const feeAmount = Math.round(platformFee * 100) / 100;
        const netAmount = Math.round((grossAmount - feeAmount) * 100) / 100;
        const createdAttempt = await tx.paymentTransaction.create({
          data: {
            id: randomUUID(),
            provider: this.providers.defaultProvider(),
            environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX',
            amount: grossAmount,
            feeAmount,
            providerFeeAmount: 0,
            netAmount,
            supplierOrgId: po.supplierOrgId,
            feeRuleId: rule?.id,
            feeSnapshot: { ruleId: rule?.id ?? null, rateType: rule?.rateType ?? null, rate: rule?.rate ?? 0, basis: rule?.rateType === 'PER_UNIT' ? applicableQty : grossAmount, calculatedFee: feeAmount },
            status: 'AWAITING_PAYMENT',
            relatedType: 'PURCHASE_ORDER',
            relatedId: po.id,
            payerOrgId: po.buyerOrgId,
            payerAgentId: agentId,
            updatedAt: now,
          },
        });
        return { attempt: createdAttempt, created: true };
      }, { isolationLevel: 'Serializable' });
      attempt = outcome.attempt;
      created = outcome.created;
    } catch (error) {
      // The partial unique index converts rapid concurrent clicks into a read
      // of the one persisted open attempt rather than two Maya checkouts.
      const active = await this.prisma.paymentTransaction.findFirst({
        where: { relatedType: 'PURCHASE_ORDER', relatedId: poId, payerAgentId: agentId, status: { in: [...OPEN_ATTEMPT_STATUSES] }, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      if (!active) throw error;
      attempt = active;
      created = false;
    }

    if (!created) {
      const reconciled: any = await this.reconcileExistingAttempt(attempt, agentId, poId);
      if (reconciled.canRetry && reconciled.transactionStatus !== 'RECONCILIATION_REQUIRED') {
        return this.createForPurchaseOrder(poId, agentId);
      }
      return reconciled;
    }
    return this.createCheckoutForAttempt(attempt, agentId, poId);
  }

  /**
   * Re-check an existing provider attempt without creating another checkout.
   * An unresolved attempt must be reconciled before it can be retried.
   */
  async reconcilePaymentTransaction(transactionId: string, agentId: string): Promise<any> {
    const attempt = await this.prisma.paymentTransaction.findFirst({
      where: {
        id: transactionId,
        payerAgentId: agentId,
        relatedType: 'PURCHASE_ORDER',
        deletedAt: null,
      },
    });
    if (!attempt) {
      throw new BadRequestException({ error: 'Payment transaction not found or access denied.' });
    }

    return this.reconcileExistingAttempt(attempt, agentId, attempt.relatedId, true);
  }

  private async reconcileExistingAttempt(attempt: any, agentId: string, poId: string, retryVerification = false) {
    if (attempt.status === 'SUCCEEDED') return this.attemptResult(attempt, { confirmed: true });
    if ((TERMINAL_ATTEMPT_STATUSES as readonly string[]).includes(attempt.status)) {
      return this.attemptResult(attempt, { canRetry: true });
    }
    if (attempt.status === 'RECONCILIATION_REQUIRED' && !retryVerification) {
      return this.attemptResult(attempt, {
        reconciliationRequired: true,
        message: 'Maya reported this payment as completed, but Kompra cannot independently verify it yet.',
      });
    }
    if (!attempt.gatewayReference) {
      return this.attemptResult(attempt, { reconciliationRequired: true, message: 'The payment attempt is still being prepared. Please check its status before starting another payment.' });
    }

    const provider = this.providers.resolve(attempt.provider);
    let observedProviderSuccess = false;
    try {
      const verified = await provider.getPaymentStatus(attempt.gatewayReference);
      if (verified.providerReference !== attempt.gatewayReference) {
        return this.attemptResult(attempt, { reconciliationRequired: true, message: 'The existing Maya payment reference requires reconciliation.' });
      }
      if (verified.status === 'SUCCEEDED') {
        observedProviderSuccess = true;
        const confirmed = await this.confirmation.confirmPaymentTransaction(attempt.id, verified);
        return this.attemptResult(confirmed, { confirmed: true });
      }
      if ((TERMINAL_ATTEMPT_STATUSES as readonly string[]).includes(verified.status)) {
        const terminal = await this.recordTerminalProviderOutcome(attempt, verified);
        return terminal.status === 'SUCCEEDED'
          ? this.attemptResult(terminal, { confirmed: true })
          : this.attemptResult(terminal, { canRetry: true });
      }
      if (attempt.status === 'RECONCILIATION_REQUIRED') {
        return this.attemptResult(attempt, {
          reconciliationRequired: true,
          message: 'Maya reported this payment as completed, but Kompra cannot independently verify it yet.',
        });
      }
      const session = this.checkoutSession(attempt);
      if (session.reusable) return this.attemptResult(attempt, { checkoutUrl: session.checkoutUrl, checkoutReusable: true, checkoutExpiresAt: session.expiresAt?.toISOString() ?? null, active: true });
      if (session.expired) {
        const expired = await this.expireUnsafeCheckout(attempt);
        return expired.status === 'SUCCEEDED'
          ? this.attemptResult(expired, { confirmed: true })
          : this.attemptResult(expired, { canRetry: true, checkoutReusable: false, message: 'The previous Maya checkout expired and will be replaced.' });
      }
      return this.attemptResult(attempt, { checkoutReusable: false, message: 'This checkout is near expiry and is not reusable. Retry after its one-hour session lifetime ends.' });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        const diagnostic = (error as any)?.mayaDiagnostic;
        console.warn('[Payment attempt reconciliation unavailable]', { agentId, poId, transactionId: attempt.id, httpStatus: diagnostic?.httpStatus, providerCode: diagnostic?.providerCode });
      }
      if (observedProviderSuccess) {
        return this.attemptResult(attempt, { reconciliationRequired: true, checkoutReusable: false, message: 'Maya reported a completed payment that requires reconciliation.' });
      }
      if (this.checkoutSession(attempt).expired) {
        const expired = await this.expireUnsafeCheckout(attempt, true);
        return expired.status === 'SUCCEEDED'
          ? this.attemptResult(expired, { confirmed: true })
          : this.attemptResult(expired, { canRetry: true, checkoutReusable: false, message: 'The previous checkout is no longer safely reusable and will be replaced.' });
      }
      return this.attemptResult(attempt, { reconciliationRequired: true, checkoutReusable: false, message: 'Maya verification is temporarily unavailable. No new checkout was created.' });
    }
  }

  async recordWebhookOutcome(attempt: any, event: any, verificationDiagnostic?: { providerCode?: string; httpStatus?: number }) {
    const current = await this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: attempt.id } });
    if (current.status === 'SUCCEEDED') {
      return current;
    }
    if ((TERMINAL_ATTEMPT_STATUSES as readonly string[]).includes(current.status)) {
      if (event.status === 'SUCCEEDED' && current.status === 'EXPIRED' && (current.feeSnapshot as any)?.checkoutTerminalSource === 'INTERNAL_PROVIDER_TTL') {
        await this.prisma.paymentTransaction.updateMany({ where: { id: current.id, status: 'EXPIRED' }, data: { status: 'RECONCILIATION_REQUIRED', feeSnapshot: { ...(current.feeSnapshot as object ?? {}), lateSuccessEvidence: { eventId: event.eventId, receivedAt: event.occurredAt.toISOString(), amount: event.amount, currency: event.currency } } } });
        return this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: current.id } });
      }
      return current;
    }
    if ((TERMINAL_ATTEMPT_STATUSES as readonly string[]).includes(event.status)) {
      return this.recordTerminalProviderOutcome(current, event);
    }
    if (event.status === 'SUCCEEDED') {
      const metadata = event.metadata as Record<string, any>;
      const webhookStatus = String(metadata.paymentStatus ?? metadata.status ?? '').toUpperCase();
      const requestReferenceNumber = typeof (metadata.requestReferenceNumber ?? metadata.metadata?.requestReferenceNumber) === 'string'
        ? (metadata.requestReferenceNumber ?? metadata.metadata?.requestReferenceNumber).trim()
        : '';
      await this.prisma.paymentTransaction.updateMany({
        where: { id: current.id, status: { in: ['PENDING', 'AWAITING_PAYMENT', 'PROCESSING', 'RECONCILIATION_REQUIRED'] } },
        data: {
          status: 'RECONCILIATION_REQUIRED',
          feeSnapshot: {
            ...(current.feeSnapshot as object ?? {}),
            providerEventId: event.eventId,
            providerStatus: event.status,
            providerStatusObservedAt: event.occurredAt.toISOString(),
            reconciliationRequiredAt: new Date().toISOString(),
            ...(verificationDiagnostic ? {
              providerVerification: {
                result: 'UNAVAILABLE',
                providerCode: verificationDiagnostic.providerCode ?? null,
                httpStatus: verificationDiagnostic.httpStatus ?? null,
              },
            } : {}),
            sandboxWebhookEvidence: {
              status: webhookStatus,
              isPaid: metadata.isPaid === true,
              requestReferenceNumber,
              providerReference: event.providerReference,
              amount: event.amount,
              currency: event.currency,
              receivedAt: event.occurredAt.toISOString(),
            },
          },
        },
      });
      return this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: current.id } });
    }
    return current;
  }

  async recordWebhookSuccessEvidence(attempt: any, event: any) {
    const metadata = event.metadata as Record<string, any>;
    const requestReferenceNumber = typeof (metadata.requestReferenceNumber ?? metadata.metadata?.requestReferenceNumber) === 'string'
      ? (metadata.requestReferenceNumber ?? metadata.metadata?.requestReferenceNumber).trim()
      : '';
    await this.prisma.paymentTransaction.updateMany({
      where: { id: attempt.id, status: { in: ['PENDING', 'AWAITING_PAYMENT', 'PROCESSING', 'RECONCILIATION_REQUIRED'] } },
      data: {
        feeSnapshot: {
          ...(attempt.feeSnapshot as object ?? {}),
          sandboxWebhookEvidence: {
            status: String(metadata.paymentStatus ?? metadata.status ?? '').toUpperCase(),
            isPaid: metadata.isPaid === true,
            requestReferenceNumber,
            providerReference: event.providerReference,
            amount: event.amount,
            currency: event.currency,
            receivedAt: event.occurredAt.toISOString(),
          },
        },
      },
    });
    return this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: attempt.id } });
  }

  private async recordTerminalProviderOutcome(attempt: any, event: any) {
    await this.prisma.paymentTransaction.updateMany({
      where: { id: attempt.id, status: { in: ['PENDING', 'AWAITING_PAYMENT', 'PROCESSING', 'RECONCILIATION_REQUIRED'] } },
      data: {
        status: event.status,
        feeSnapshot: {
          ...(attempt.feeSnapshot as object ?? {}),
          providerEventId: event.eventId,
          providerStatus: event.status,
          providerStatusObservedAt: event.occurredAt.toISOString(),
          failureReason: event.metadata?.failureReason ?? event.metadata?.message ?? null,
        },
      },
    });
    return this.prisma.paymentTransaction.findUniqueOrThrow({ where: { id: attempt.id } });
  }

  private async createCheckoutForAttempt(attempt: any, agentId: string, poId: string) {
    const provider = this.providers.resolve(attempt.provider);
    const purchaseOrder = await this.prisma.purchaseOrder.findUniqueOrThrow({ where: { id: poId }, select: { poNumber: true } });
    const withTransactionId = (value: string) => {
      const url = new URL(value);
      url.searchParams.set('transactionId', attempt.id);
      return url.toString();
    };
    if (process.env.NODE_ENV === 'development') console.info('[Payment initiation]', { agentId, poId, provider: attempt.provider, transactionStatus: attempt.status });
    try {
      const checkout = await provider.createCheckout({
        transactionId: attempt.id,
        poNumber: purchaseOrder.poNumber,
        amount: attempt.amount,
        successUrl: withTransactionId(process.env.MAYA_SUCCESS_URL!),
        cancelUrl: withTransactionId(process.env.MAYA_CANCEL_URL!),
      });
      const snapshot = attempt.feeSnapshot as Record<string, unknown> | null;
      const checkoutCreatedAt = new Date();
      const checkoutExpiresAt = new Date(checkoutCreatedAt.getTime() + CHECKOUT_SESSION_LIFETIME_MS);
      const updated = await this.prisma.paymentTransaction.update({
        where: { id: attempt.id },
        data: {
          gatewayReference: checkout.providerReference,
          feeSnapshot: { ...(snapshot ?? {}), provider: PaymentGatewayProvider.PAYMAYA, checkoutUrl: checkout.checkoutUrl, checkoutCreatedAt: checkoutCreatedAt.toISOString(), checkoutExpiresAt: checkoutExpiresAt.toISOString(), checkoutApplication: 'KOMPRA_PH', providerMetadata: checkout.rawMetadata as any },
          status: 'PROCESSING',
        },
      });
      return this.attemptResult(updated, { checkoutUrl: checkout.checkoutUrl, checkoutReusable: true, checkoutExpiresAt: checkoutExpiresAt.toISOString(), active: true });
    } catch (error) {
      await this.prisma.paymentTransaction.updateMany({
        where: { id: attempt.id, status: 'AWAITING_PAYMENT' },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  private attemptResult(attempt: any, additional: Record<string, unknown> = {}) {
    return {
      id: attempt.id,
      transactionId: attempt.id,
      transactionStatus: attempt.status,
      provider: attempt.provider,
      amount: attempt.amount,
      checkoutReusable: false,
      checkoutExpiresAt: this.checkoutSession(attempt).expiresAt?.toISOString() ?? null,
      ...additional,
    };
  }

  private checkoutSession(attempt: any) {
    const snapshot = attempt.feeSnapshot as Record<string, unknown> | null;
    const checkoutUrl = typeof snapshot?.checkoutUrl === 'string' ? snapshot.checkoutUrl : null;
    const createdAt = typeof snapshot?.checkoutCreatedAt === 'string' ? new Date(snapshot.checkoutCreatedAt) : null;
    const expiryBasis = createdAt ?? (attempt.updatedAt ? new Date(attempt.updatedAt) : null);
    const expiresAt = typeof snapshot?.checkoutExpiresAt === 'string' ? new Date(snapshot.checkoutExpiresAt) : null;
    const reusableUntil = createdAt && !Number.isNaN(createdAt.getTime())
      ? Math.min(createdAt.getTime() + CHECKOUT_REUSE_WINDOW_MS, expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt.getTime() : Number.POSITIVE_INFINITY)
      : 0;
    return { checkoutUrl, expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null, reusable: Boolean(checkoutUrl && reusableUntil > Date.now()), expired: Boolean(expiryBasis && !Number.isNaN(expiryBasis.getTime()) && expiryBasis.getTime() + CHECKOUT_SESSION_LIFETIME_MS <= Date.now()) };
  }

  private async expireUnsafeCheckout(attempt: any, verificationUnavailable = false) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${attempt.relatedId} FOR UPDATE`;
      const succeeded = await tx.paymentTransaction.findFirst({ where: { relatedType: 'PURCHASE_ORDER', relatedId: attempt.relatedId, status: 'SUCCEEDED', deletedAt: null } });
      if (succeeded) return succeeded;
      await tx.paymentTransaction.updateMany({
        where: { id: attempt.id, status: { in: ['PENDING', 'AWAITING_PAYMENT', 'PROCESSING'] } },
        data: { status: 'EXPIRED', feeSnapshot: { ...(attempt.feeSnapshot as object ?? {}), checkoutSupersededAt: new Date().toISOString(), checkoutTerminalSource: 'INTERNAL_PROVIDER_TTL', verificationUnavailable } },
      });
      return tx.paymentTransaction.findUniqueOrThrow({ where: { id: attempt.id } });
    }, { isolationLevel: 'Serializable' });
  }

  private assertConsistentCommercialSnapshot(po: any) {
    const lineSubtotal = po.POLineItem.reduce((sum: number, line: any) => sum + Number(line.subtotal ?? 0), 0);
    const extraCharges = Array.isArray(po.extraCharges)
      ? (po.extraCharges as Array<{ amount?: unknown }>).reduce((sum, charge) => sum + Number(charge?.amount ?? 0), 0)
      : Number(po.extraChargesTotal ?? 0);
    const expectedTotal = lineSubtotal + Number(po.vatAmount ?? 0) + extraCharges;
    const totalAmount = Number(po.totalAmount);
    if (!Number.isFinite(totalAmount) || Math.abs(totalAmount - expectedTotal) > 0.01) {
      throw new BadRequestException({ error: `This purchase order has an inconsistent commercial snapshot and is unsafe for payment. Expected ${expectedTotal.toFixed(2)} from line items/VAT/charges; found ${totalAmount.toFixed(2)}. Create a fresh PO after the commercial snapshot fix.` });
    }
  }
}
