import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from './prisma.service';
import { RealtimeGateway } from '../gateway/realtime.gateway';
import { cancellationRequiresRefund, purchaseOrderCancellationMode } from './purchase-order-cancellation.policy';

const MONEY_TOLERANCE = 0.009;

type CancellationActor = {
  orgId?: number;
  userId?: number;
};

type RefundEvidence = {
  providerRefundId: string;
  amount: number;
  currency: string;
  occurredAt: Date;
  evidence: Prisma.InputJsonValue;
};

@Injectable()
export class PurchaseOrderCancellationService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeGateway) {}

  assertInternalAccess(provided?: string) {
    const configured = process.env.PORTAL_COMMERCE_SERVICE_KEY
      || (process.env.NODE_ENV !== 'production' ? process.env.SANDBOX_SETTLEMENT_SERVICE_KEY : undefined);
    if (!configured) throw new ServiceUnavailableException('Internal commerce service authentication is not configured.');
    const supplied = provided?.trim() ?? '';
    const expected = Buffer.from(configured);
    const actual = Buffer.from(supplied);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new ForbiddenException('Internal commerce service authentication failed.');
    }
  }

  async getState(purchaseOrderId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
    if (!po) throw new BadRequestException('Purchase order not found.');
    const [cancellation, refund, payment, settlement, feeRecord] = await Promise.all([
      this.prisma.purchaseOrderCancellation.findUnique({ where: { purchaseOrderId } }),
      this.prisma.paymentRefund.findUnique({ where: { purchaseOrderId } }),
      this.prisma.paymentTransaction.findFirst({ where: { relatedType: 'PURCHASE_ORDER', relatedId: purchaseOrderId, deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.purchaseOrderSettlement.findUnique({ where: { purchaseOrderId } }),
      this.prisma.platformFeeRecord.findFirst({ where: { purchaseOrderId } }),
    ]);
    const wallet = payment?.supplierOrgId ? await this.prisma.wallet.findUnique({ where: { orgId_environment: { orgId: payment.supplierOrgId, environment: payment.environment } } }) : null;
    const escrow = wallet && payment ? await this.prisma.walletLedgerEntry.findUnique({ where: { walletId_sourceType_referenceId: { walletId: wallet.id, sourceType: 'ESCROW_HOLD', referenceId: payment.id } } }) : null;
    const reversal = wallet && refund ? await this.prisma.walletLedgerEntry.findUnique({ where: { walletId_sourceType_referenceId: { walletId: wallet.id, sourceType: 'ESCROW_REVERSAL', referenceId: refund.id } } }) : null;
    const platformPosting = settlement ? await this.prisma.platformWalletLedgerEntry.findFirst({ where: { sourceType: 'PURCHASE_ORDER_PLATFORM_FEE', referenceId: settlement.id } }) : null;
    return this.toResult(po, cancellation, refund, false, {
      paymentTransactionId: payment?.id ?? null,
      paymentProvider: payment?.provider ?? null,
      providerReference: payment?.gatewayReference ?? null,
      paymentAmount: payment?.amount ?? null,
      supplierNet: payment?.netAmount ?? null,
      platformFee: feeRecord?.feeAmount ?? null,
      environment: payment?.environment ?? refund?.environment ?? null,
      escrowStatus: escrow?.status ?? null,
      escrowReversalEntryId: reversal?.id ?? null,
      settlementId: settlement?.id ?? null,
      platformFeeDisposition: platformPosting ? 'POSTED' : settlement ? 'NOT_POSTED_REQUIRES_REVIEW' : 'NOT_POSTED_PRE_SETTLEMENT',
    });
  }

  async requestOrCancel(purchaseOrderId: string, buyerOrgId: number, actor: CancellationActor, reason: string) {
    const normalizedReason = this.requireReason(reason);
    const result = await this.withSerializableRetry(async (tx) => {
      const po = await this.lockPurchaseOrder(tx, purchaseOrderId);
      if (po.buyerOrgId !== buyerOrgId) throw new BadRequestException('Purchase order not found.');
      if (po.status === 'REJECTED') throw new BadRequestException('A rejected purchase order cannot be cancelled.');
      const mode = purchaseOrderCancellationMode(po.status);
      if (mode === 'RETURN_OR_DISPUTE') {
        throw new BadRequestException('This order can no longer use ordinary cancellation. Use the return, refund, or dispute workflow.');
      }

      const existing = await tx.purchaseOrderCancellation.findUnique({ where: { purchaseOrderId } });
      if (po.status === 'CANCELLED') {
        const refund = await tx.paymentRefund.findUnique({ where: { purchaseOrderId } });
        return { result: this.toResult(po, existing, refund, true), event: null };
      }
      if (existing?.status === 'REQUESTED') {
        const refund = await tx.paymentRefund.findUnique({ where: { purchaseOrderId } });
        return { result: this.toResult(po, existing, refund, true), event: null };
      }
      if (mode !== 'DIRECT' && mode !== 'REQUEST_APPROVAL') {
        throw new BadRequestException('The purchase order is not eligible for cancellation.');
      }

      const now = new Date();
      if (mode === 'REQUEST_APPROVAL') {
        await tx.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { deliveryDateResponseDeadlineAt: null } });
        const cancellation = await tx.purchaseOrderCancellation.upsert({
          where: { purchaseOrderId },
          create: {
            purchaseOrderId,
            reason: normalizedReason,
            status: 'REQUESTED',
            requestedByOrgId: buyerOrgId,
            requestedByUserId: actor.userId,
            requestedAt: now,
          },
          update: {
            reason: normalizedReason,
            status: 'REQUESTED',
            requestedByOrgId: buyerOrgId,
            requestedByUserId: actor.userId,
            requestedAt: now,
            approvedByOrgId: null,
            approvedByUserId: null,
            rejectedByOrgId: null,
            rejectedByUserId: null,
            decidedAt: null,
            cancelledAt: null,
          },
        });
        await this.createAudit(tx, actor, buyerOrgId, po.id, 'CANCELLATION_REQUESTED', { orderStatus: po.status, cancellationStatus: 'REQUESTED' });
        await this.createSystemRecords(tx, po, 'Purchase order cancellation requested', `The buyer requested cancellation of ${po.poNumber}. Reason: ${normalizedReason}`, po.supplierOrgId, 'cancellation_requested');
        return { result: this.toResult(po, cancellation, null, false), event: 'purchaseOrder:cancellationRequested' as const };
      }

      const settlement = await tx.purchaseOrderSettlement.findUnique({ where: { purchaseOrderId } });
      if (settlement) throw new BadRequestException('A settled purchase order cannot be cancelled.');
      const payment = await this.getSucceededPayment(tx, purchaseOrderId);
      if (payment) await this.assertNoPlatformPosting(tx, payment.id);
      const updatedPo = await tx.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { status: 'CANCELLED', deliveryDateResponseDeadlineAt: null } });
      await tx.delivery.updateMany({ where: { poId: purchaseOrderId, status: { notIn: ['DELIVERED', 'FAILED', 'CANCELLED'] } }, data: { status: 'CANCELLED', updatedAt: now } });
      const cancellation = await tx.purchaseOrderCancellation.upsert({
        where: { purchaseOrderId },
        create: {
          purchaseOrderId,
          reason: normalizedReason,
          status: 'APPROVED',
          requestedByOrgId: buyerOrgId,
          requestedByUserId: actor.userId,
          approvedByOrgId: buyerOrgId,
          approvedByUserId: actor.userId,
          requestedAt: now,
          decidedAt: now,
          cancelledAt: now,
        },
        update: {
          reason: normalizedReason,
          status: 'APPROVED',
          approvedByOrgId: buyerOrgId,
          approvedByUserId: actor.userId,
          decidedAt: now,
          cancelledAt: now,
        },
      });
      const refund = cancellationRequiresRefund(Boolean(payment)) ? await this.ensureManualRefund(tx, payment!, normalizedReason, actor.userId, actor.userId) : null;
      await this.createAudit(tx, actor, buyerOrgId, po.id, 'ORDER_CANCELLED', { priorOrderStatus: po.status, refundStatus: refund?.status ?? null });
      await this.createSystemRecords(tx, po, payment ? 'Purchase order cancelled; refund required' : 'Purchase order cancelled', payment
        ? `${po.poNumber} was cancelled. The confirmed payment is awaiting an authoritative refund; escrow remains held until then.`
        : `${po.poNumber} was cancelled before payment.`, po.supplierOrgId, 'order_cancelled');
      return { result: this.toResult(updatedPo, cancellation, refund, false), event: 'purchaseOrder:cancelled' as const };
    });
    this.emit(result.event, result.result);
    return result.result;
  }

  async approve(purchaseOrderId: string, supplierOrgId: number, actor: CancellationActor) {
    const result = await this.withSerializableRetry(async (tx) => {
      const po = await this.lockPurchaseOrder(tx, purchaseOrderId);
      if (po.supplierOrgId !== supplierOrgId) throw new BadRequestException('Purchase order not found.');
      const cancellation = await tx.purchaseOrderCancellation.findUnique({ where: { purchaseOrderId } });
      if (po.status === 'CANCELLED' && cancellation?.status === 'APPROVED') {
        const refund = await tx.paymentRefund.findUnique({ where: { purchaseOrderId } });
        return { result: this.toResult(po, cancellation, refund, true), event: null };
      }
      if (!cancellation || cancellation.status !== 'REQUESTED') throw new BadRequestException('No pending cancellation request was found.');
      if (purchaseOrderCancellationMode(po.status) !== 'REQUEST_APPROVAL') {
        if (purchaseOrderCancellationMode(po.status) === 'RETURN_OR_DISPUTE') {
          throw new BadRequestException('The order has already entered dispatch or completion and cannot be cancelled.');
        }
        throw new BadRequestException('The purchase order is not eligible for cancellation approval.');
      }
      const settlement = await tx.purchaseOrderSettlement.findUnique({ where: { purchaseOrderId } });
      if (settlement) throw new BadRequestException('A settled purchase order cannot be cancelled.');
      const now = new Date();
      const payment = await this.getSucceededPayment(tx, purchaseOrderId);
      if (payment) await this.assertNoPlatformPosting(tx, payment.id);
      const updatedPo = await tx.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { status: 'CANCELLED', deliveryDateResponseDeadlineAt: null } });
      await tx.delivery.updateMany({ where: { poId: purchaseOrderId, status: { notIn: ['DELIVERED', 'FAILED', 'CANCELLED'] } }, data: { status: 'CANCELLED', updatedAt: now } });
      const approved = await tx.purchaseOrderCancellation.update({
        where: { purchaseOrderId },
        data: { status: 'APPROVED', approvedByOrgId: supplierOrgId, approvedByUserId: actor.userId, decidedAt: now, cancelledAt: now },
      });
      const refund = payment ? await this.ensureManualRefund(tx, payment, cancellation.reason, cancellation.requestedByUserId ?? undefined, actor.userId) : null;
      await this.createAudit(tx, actor, supplierOrgId, po.id, 'CANCELLATION_APPROVED', { priorOrderStatus: po.status, refundStatus: refund?.status ?? null });
      if (po.buyerOrgId) await this.createSystemRecords(tx, po, payment ? 'Cancellation approved; refund required' : 'Cancellation approved', payment
        ? `${po.poNumber} was cancelled. Its confirmed payment is awaiting an authoritative refund.`
        : `${po.poNumber} was cancelled before payment.`, po.buyerOrgId, 'cancellation_approved');
      return { result: this.toResult(updatedPo, approved, refund, false), event: 'purchaseOrder:cancelled' as const };
    });
    this.emit(result.event, result.result);
    return result.result;
  }

  async reject(purchaseOrderId: string, supplierOrgId: number, actor: CancellationActor, reason: string) {
    const normalizedReason = this.requireReason(reason);
    const result = await this.withSerializableRetry(async (tx) => {
      const po = await this.lockPurchaseOrder(tx, purchaseOrderId);
      if (po.supplierOrgId !== supplierOrgId) throw new BadRequestException('Purchase order not found.');
      const cancellation = await tx.purchaseOrderCancellation.findUnique({ where: { purchaseOrderId } });
      if (cancellation?.status === 'REJECTED') {
        const refund = await tx.paymentRefund.findUnique({ where: { purchaseOrderId } });
        return { result: this.toResult(po, cancellation, refund, true), event: null };
      }
      if (!cancellation || cancellation.status !== 'REQUESTED') throw new BadRequestException('No pending cancellation request was found.');
      if (purchaseOrderCancellationMode(po.status) !== 'REQUEST_APPROVAL') throw new BadRequestException('The cancellation request can no longer be rejected.');
      const rejected = await tx.purchaseOrderCancellation.update({
        where: { purchaseOrderId },
        data: { status: 'REJECTED', rejectedByOrgId: supplierOrgId, rejectedByUserId: actor.userId, decidedAt: new Date(), reason: `${cancellation.reason}\nSupplier decision: ${normalizedReason}` },
      });
      await this.createAudit(tx, actor, supplierOrgId, po.id, 'CANCELLATION_REJECTED', { orderStatus: po.status });
      if (po.buyerOrgId) await this.createSystemRecords(tx, po, 'Cancellation request declined', `${po.poNumber} remains active. Reason: ${normalizedReason}`, po.buyerOrgId, 'cancellation_rejected');
      return { result: this.toResult(po, rejected, null, false), event: 'purchaseOrder:cancellationRejected' as const };
    });
    this.emit(result.event, result.result);
    return result.result;
  }

  /** Provider adapters call this only after an authoritative, matching refund result. */
  async completeRefundFromProvider(refundId: string, evidence: RefundEvidence) {
    const result = await this.withSerializableRetry(async (tx) => {
      const refund = await tx.paymentRefund.findUnique({ where: { id: refundId } });
      if (!refund) throw new BadRequestException('Payment refund not found.');
      const po = await this.lockPurchaseOrder(tx, refund.purchaseOrderId);
      const providerRefundId = evidence.providerRefundId?.trim();
      if (!providerRefundId || refund.currency !== 'PHP' || evidence.currency !== refund.currency || !this.amountsMatch(evidence.amount, refund.amount)) {
        throw new BadRequestException('Provider refund amount or currency does not match the payment refund.');
      }
      if (refund.status === 'REFUNDED') {
        if (refund.providerRefundId !== providerRefundId) throw new BadRequestException('Provider refund reference does not match the completed refund.');
        return { refund, po, changed: false, wallet: null };
      }
      if (po.status !== 'CANCELLED') throw new BadRequestException('Only a cancelled purchase order can complete a refund.');
      const payment = await tx.paymentTransaction.findUnique({ where: { id: refund.paymentTransactionId } });
      if (!payment || payment.status !== 'SUCCEEDED' || payment.relatedId !== po.id || payment.environment !== refund.environment || !this.amountsMatch(payment.amount, refund.amount)) {
        throw new BadRequestException('The original successful payment does not match this refund.');
      }
      if (await tx.purchaseOrderSettlement.findUnique({ where: { purchaseOrderId: po.id } })) {
        throw new BadRequestException('A settled purchase order cannot be refunded through escrow reversal.');
      }
      await this.assertNoPlatformPosting(tx, payment.id);
      const wallet = await tx.wallet.findUnique({ where: { orgId_environment: { orgId: po.supplierOrgId, environment: refund.environment } } });
      if (!wallet) throw new BadRequestException('The supplier wallet for this refund is unavailable.');
      const escrow = await tx.walletLedgerEntry.findUnique({ where: { walletId_sourceType_referenceId: { walletId: wallet.id, sourceType: 'ESCROW_HOLD', referenceId: payment.id } } });
      if (!escrow || escrow.deletedAt || escrow.status !== 'HELD' || escrow.type !== 'CREDIT' || !this.amountsMatch(escrow.amount, payment.netAmount)) {
        throw new BadRequestException('The matching supplier escrow hold is unavailable or requires reconciliation.');
      }
      if (wallet.heldBalance + MONEY_TOLERANCE < payment.netAmount) throw new BadRequestException('Supplier held funds cannot cover this refund.');
      const existingReversal = await tx.walletLedgerEntry.findUnique({ where: { walletId_sourceType_referenceId: { walletId: wallet.id, sourceType: 'ESCROW_REVERSAL', referenceId: refund.id } } });
      if (existingReversal) throw new BadRequestException('An incomplete escrow reversal requires reconciliation.');
      const updatedWallet = await tx.wallet.update({ where: { id: wallet.id }, data: { heldBalance: { decrement: payment.netAmount }, updatedAt: evidence.occurredAt } });
      await tx.walletLedgerEntry.update({ where: { id: escrow.id }, data: { status: 'REVERSED' } });
      await tx.walletLedgerEntry.create({ data: { walletId: wallet.id, type: 'DEBIT', sourceType: 'ESCROW_REVERSAL', referenceId: refund.id, amount: payment.netAmount, balanceAfter: updatedWallet.heldBalance, status: 'REVERSED', environment: refund.environment } });
      await tx.purchaseOrder.update({ where: { id: po.id }, data: { paymentStatus: 'REFUNDED' } });
      const completed = await tx.paymentRefund.update({ where: { id: refund.id }, data: { status: 'REFUNDED', providerRefundId, completedAt: evidence.occurredAt, evidence: evidence.evidence } });
      if (po.buyerOrgId) await this.createSystemRecords(tx, po, 'Purchase order refund completed', `The ${refund.currency} ${refund.amount.toFixed(2)} refund for ${po.poNumber} was confirmed by the payment provider.`, po.buyerOrgId, 'refund_completed');
      return { refund: completed, po, changed: true, wallet: updatedWallet };
    });
    if (result.changed) {
      const payload = { poId: result.po.id, refundId: result.refund.id, refundStatus: result.refund.status };
      this.realtime.emitToOrganization(result.po.supplierOrgId, 'purchaseOrder:refundUpdated', payload);
      if (result.po.buyerOrgId) this.realtime.emitToOrganization(result.po.buyerOrgId, 'purchaseOrder:refundUpdated', payload);
      if (result.wallet) this.realtime.emitToOrganization(result.po.supplierOrgId, 'wallet:updated', { walletId: result.wallet.id, balance: result.wallet.balance, heldBalance: result.wallet.heldBalance, environment: result.refund.environment });
    }
    return result.refund;
  }

  private async lockPurchaseOrder(tx: Prisma.TransactionClient, purchaseOrderId: string) {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "PurchaseOrder" WHERE id = ${purchaseOrderId} FOR UPDATE`;
    if (locked.length !== 1) throw new BadRequestException('Purchase order not found.');
    return tx.purchaseOrder.findUniqueOrThrow({ where: { id: purchaseOrderId } });
  }

  private getSucceededPayment(tx: Prisma.TransactionClient, purchaseOrderId: string) {
    return tx.paymentTransaction.findFirst({ where: { relatedType: 'PURCHASE_ORDER', relatedId: purchaseOrderId, status: 'SUCCEEDED', deletedAt: null } });
  }

  private async assertNoPlatformPosting(tx: Prisma.TransactionClient, paymentTransactionId: string) {
    const posting = await tx.platformWalletLedgerEntry.findFirst({ where: { paymentTransactionId } });
    if (posting) throw new BadRequestException('Platform revenue has already been posted for this payment. Use the governed return/refund reconciliation workflow.');
  }

  private ensureManualRefund(tx: Prisma.TransactionClient, payment: { id: string; relatedId: string; amount: number; environment: any }, reason: string, requestedById?: number, approvedById?: number) {
    return tx.paymentRefund.upsert({
      where: { paymentTransactionId: payment.id },
      create: { id: randomUUID(), paymentTransactionId: payment.id, purchaseOrderId: payment.relatedId, amount: payment.amount, currency: 'PHP', reason, status: 'REQUIRES_MANUAL_REFUND', requestedById, approvedById, environment: payment.environment },
      update: {},
    });
  }

  private async createSystemRecords(tx: Prisma.TransactionClient, po: { id: string; poNumber: string; conversationId: string | null }, title: string, message: string, recipientOrgId: number, event: string) {
    await tx.notification.create({ data: { orgId: recipientOrgId, type: 'NEW_TRANSACTION', title, message, conversationId: po.conversationId } });
    if (po.conversationId) await tx.conversationMessage.create({ data: { conversationId: po.conversationId, type: 'SYSTEM', message, metadata: { event, poId: po.id, poNumber: po.poNumber } } });
  }

  private async createAudit(tx: Prisma.TransactionClient, actor: CancellationActor, orgId: number, purchaseOrderId: string, action: string, newValue: Record<string, unknown>) {
    if (!actor.userId) return;
    await tx.auditLog.create({ data: { id: randomUUID(), orgId, userId: actor.userId, pageKey: 'purchaseOrderCancellation', action: 'STATUS_CHANGE', recordId: purchaseOrderId, recordType: 'PurchaseOrder', newValue: { action, ...newValue } } });
  }

  private toResult(po: { id: string; poNumber: string; status: any; paymentStatus: any; buyerOrgId: number | null; supplierOrgId: number }, cancellation: any, refund: any, idempotent: boolean, inspection: any = null) {
    return {
      purchaseOrderId: po.id,
      poNumber: po.poNumber,
      orderStatus: po.status,
      paymentStatus: po.paymentStatus,
      buyerOrgId: po.buyerOrgId,
      supplierOrgId: po.supplierOrgId,
      cancellation: cancellation ? {
        id: cancellation.id,
        status: cancellation.status,
        reason: cancellation.reason,
        requestedAt: cancellation.requestedAt,
        decidedAt: cancellation.decidedAt,
        cancelledAt: cancellation.cancelledAt,
        requestedByOrgId: cancellation.requestedByOrgId,
        requestedByUserId: cancellation.requestedByUserId,
        approvedByOrgId: cancellation.approvedByOrgId,
        approvedByUserId: cancellation.approvedByUserId,
        rejectedByOrgId: cancellation.rejectedByOrgId,
        rejectedByUserId: cancellation.rejectedByUserId,
      } : null,
      refund: refund ? {
        id: refund.id,
        status: refund.status,
        amount: refund.amount,
        currency: refund.currency,
        requestedAt: refund.requestedAt,
        completedAt: refund.completedAt,
        providerRefundId: refund.providerRefundId,
        environment: refund.environment,
      } : null,
      idempotent,
      inspection,
    };
  }

  private emit(event: 'purchaseOrder:cancellationRequested' | 'purchaseOrder:cancelled' | 'purchaseOrder:cancellationRejected' | null, result: any) {
    if (!event) return;
    this.realtime.emitToOrganization(result.supplierOrgId, event, result);
    if (result.buyerOrgId) this.realtime.emitToOrganization(result.buyerOrgId, event, result);
  }

  private requireReason(reason: string) {
    const normalized = reason?.trim();
    if (!normalized || normalized.length < 5) throw new BadRequestException('Please provide a cancellation reason of at least 5 characters.');
    if (normalized.length > 500) throw new BadRequestException('Cancellation reason must not exceed 500 characters.');
    return normalized;
  }

  private amountsMatch(left: number, right: number) {
    return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= MONEY_TOLERANCE;
  }

  private async withSerializableRetry<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, { isolationLevel: 'Serializable' });
      } catch (error: any) {
        if ((error?.code === 'P2034' || error?.code === 'P2002') && attempt < 2) continue;
        throw error;
      }
    }
    throw new BadRequestException('The cancellation could not be completed because the order changed concurrently.');
  }
}
