import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RealtimeGateway } from '../../gateway/realtime.gateway';
import { NormalizedProviderEvent } from './payment-provider';

@Injectable()
export class PaymentConfirmationService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeGateway) {}
  async confirmPaymentTransaction(transactionId: string, event: NormalizedProviderEvent) {
    const result = await this.prisma.$transaction(async tx => {
      const payment = await tx.paymentTransaction.findUniqueOrThrow({ where: { id: transactionId } });
      if (payment.status === 'SUCCEEDED') return { payment, po: null as any };
      if (payment.provider !== event.provider || !payment.gatewayReference || event.providerReference !== payment.gatewayReference || event.status !== 'SUCCEEDED' || event.currency !== 'PHP' || Math.abs(event.amount - payment.amount) > 0.009) throw new BadRequestException('Verified provider payment does not match the transaction.');
      const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: payment.relatedId } });
      const providerFee = payment.providerFeeAmount; // policy unresolved: never deduct a provider fee here.
      const netAmount = payment.netAmount;
      const wallet = await tx.wallet.upsert({ where: { orgId: payment.supplierOrgId! }, create: { orgId: payment.supplierOrgId!, balance: 0, heldBalance: netAmount, currency: 'PHP', updatedAt: new Date() }, update: { heldBalance: { increment: netAmount }, updatedAt: new Date() } });
      await tx.walletLedgerEntry.create({ data: { walletId: wallet.id, type: 'CREDIT', sourceType: 'ESCROW_HOLD', referenceId: payment.id, amount: netAmount, balanceAfter: wallet.heldBalance, status: 'HELD', environment: payment.environment } });
      const confirmed = await tx.paymentTransaction.update({ where: { id: payment.id }, data: { status: 'SUCCEEDED', gatewayReference: event.providerReference, providerFeeAmount: providerFee, netAmount, feeSnapshot: { ...(payment.feeSnapshot as any || {}), providerEventId: event.eventId, confirmedAt: event.occurredAt.toISOString() } } });
      await tx.purchaseOrder.update({ where: { id: po.id }, data: { paymentStatus: 'PAID', receiptSnapshot: { receiptId: `RCPT-${confirmed.id}`, paymentTransactionId: confirmed.id, poNumber: po.poNumber, provider: confirmed.provider, providerReference: event.providerReference, grossAmount: confirmed.amount, platformFee: confirmed.feeAmount, providerFee, netAmount, confirmedAt: event.occurredAt.toISOString() } } });
      if (po.conversationId) await tx.conversationMessage.create({ data: { conversationId: po.conversationId, senderOrgId: po.supplierOrgId, type: 'PAYMENT_RECEIVED', message: 'Payment Confirmed', metadata: { event: 'payment_confirmed', paymentTransactionId: confirmed.id, provider: confirmed.provider, amount: confirmed.amount, reference: event.providerReference } } });
      return { payment: confirmed, po };
    });
    if (result.po) { const payload = { poId: result.po.id, paymentTransactionId: result.payment.id, amount: result.payment.amount, provider: result.payment.provider }; this.realtime.emitToOrganization(result.po.supplierOrgId, 'purchaseOrder:paymentReceived', payload); if (result.po.buyerOrgId) this.realtime.emitToOrganization(result.po.buyerOrgId, 'purchaseOrder:paymentReceived', payload); if (result.payment.payerAgentId) this.realtime.emitToUser(result.payment.payerAgentId, 'purchaseOrder:paymentReceived', payload); if (result.po.conversationId) this.realtime.emitToConversation(result.po.conversationId, 'conversation:newMessage', payload); }
    return result.payment;
  }
}
