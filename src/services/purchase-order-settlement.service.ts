import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from './prisma.service';

type FeeSnapshot = {
  ruleId?: unknown;
  rateType?: unknown;
  rate?: unknown;
  basis?: unknown;
  calculatedFee?: unknown;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const isMoney = (value: number) => Number.isFinite(value) && value >= 0;
const equalMoney = (left: number, right: number) => Math.abs(left - right) <= 0.009;

/**
 * Calculates the final commercial settlement only. Wallet availability,
 * payouts, and withdrawal processing intentionally begin in Day 13.2.
 */
@Injectable()
export class PurchaseOrderSettlementService {
  constructor(private readonly prisma: PrismaService) {}

  async settlePurchaseOrder(purchaseOrderId: string) {
    for (let retry = 0; retry < 3; retry += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const existing = await tx.purchaseOrderSettlement.findUnique({ where: { purchaseOrderId } });
          if (existing) return existing;

          const purchaseOrder = await tx.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
          if (!purchaseOrder) throw new BadRequestException('Purchase order not found for settlement.');
          if (purchaseOrder.status !== 'COMPLETED' || !purchaseOrder.buyerConfirmedAt) {
            throw new BadRequestException('Settlement requires a completed purchase order with buyer receipt confirmation.');
          }
          if (purchaseOrder.supplierConfirmation !== 'CONFIRMED') {
            throw new BadRequestException('Settlement requires supplier confirmation.');
          }

          const supplier = await tx.organization.findFirst({
            where: { id: purchaseOrder.supplierOrgId, deletedAt: null },
            select: { id: true },
          });
          if (!supplier) throw new BadRequestException('Settlement supplier organization no longer exists.');

          const payment = await tx.paymentTransaction.findFirst({
            where: {
              relatedType: 'PURCHASE_ORDER',
              relatedId: purchaseOrder.id,
              status: 'SUCCEEDED',
              deletedAt: null,
            },
          });
          if (!payment) throw new BadRequestException('Settlement requires an authoritative successful payment transaction.');
          if (payment.supplierOrgId !== purchaseOrder.supplierOrgId) {
            throw new BadRequestException('Successful payment supplier does not match this purchase order; reconciliation is required.');
          }

          const grossAmount = roundMoney(Number(payment.amount));
          const purchaseOrderAmount = roundMoney(Number(purchaseOrder.totalAmount));
          if (!isMoney(grossAmount) || !equalMoney(grossAmount, purchaseOrderAmount)) {
            throw new BadRequestException('Successful payment amount does not match the purchase order total; reconciliation is required.');
          }

          if (!payment.feeRuleId) {
            throw new BadRequestException('No active settlement fee rule is configured for this transaction.');
          }
          const feeRule = await tx.feeRule.findFirst({
            where: { id: payment.feeRuleId, appliesTo: 'PURCHASE_ORDER' },
          });
          if (!feeRule) throw new BadRequestException('The payment fee rule is unavailable; reconciliation is required.');

          const paymentSnapshot = (payment.feeSnapshot ?? {}) as FeeSnapshot;
          if (paymentSnapshot.ruleId !== feeRule.id || typeof paymentSnapshot.rateType !== 'string' || typeof paymentSnapshot.rate !== 'number' || typeof paymentSnapshot.basis !== 'number') {
            throw new BadRequestException('The payment fee snapshot is incomplete; reconciliation is required.');
          }

          const rate = paymentSnapshot.rate;
          const basis = paymentSnapshot.basis;
          let platformFee: number;
          switch (paymentSnapshot.rateType) {
            case 'PERCENTAGE':
              platformFee = grossAmount * rate;
              break;
            case 'PER_UNIT':
              platformFee = basis * rate;
              break;
            case 'FLAT':
              platformFee = rate;
              break;
            default:
              throw new BadRequestException('The payment fee rule has an unsupported rate type.');
          }
          platformFee = roundMoney(platformFee);
          if (!isMoney(platformFee) || platformFee > grossAmount) {
            throw new BadRequestException('Calculated platform fee is outside the purchase order amount; reconciliation is required.');
          }
          if (!equalMoney(platformFee, Number(payment.feeAmount)) || (typeof paymentSnapshot.calculatedFee === 'number' && !equalMoney(platformFee, paymentSnapshot.calculatedFee))) {
            throw new BadRequestException('Payment fee data does not match the settlement calculation; reconciliation is required.');
          }

          const supplierNet = roundMoney(grossAmount - platformFee);
          if (!isMoney(supplierNet) || !equalMoney(grossAmount, roundMoney(platformFee + supplierNet)) || !equalMoney(supplierNet, Number(payment.netAmount))) {
            throw new BadRequestException('Payment net amount does not match the settlement calculation; reconciliation is required.');
          }

          const settledAt = new Date();
          return tx.purchaseOrderSettlement.create({
            data: {
              id: randomUUID(),
              purchaseOrderId: purchaseOrder.id,
              paymentTransactionId: payment.id,
              supplierOrgId: supplier.id,
              grossAmount,
              platformFee,
              supplierNet,
              feeRuleId: feeRule.id,
              feeSnapshot: {
                source: 'PAYMENT_TRANSACTION_SNAPSHOT',
                paymentTransactionId: payment.id,
                resolvedAt: payment.createdAt.toISOString(),
                feeRule: {
                  id: feeRule.id,
                  appliesTo: feeRule.appliesTo,
                  category: feeRule.category,
                  unitType: feeRule.unitType,
                  rateType: paymentSnapshot.rateType,
                  rate,
                  tierModifier: feeRule.tierModifier,
                },
                basis,
                calculatedFee: platformFee,
              },
              environment: payment.environment,
              status: 'SETTLED',
              settledAt,
            },
          });
        }, { isolationLevel: 'Serializable' });
      } catch (error: any) {
        if (error?.code === 'P2002') {
          const existing = await this.prisma.purchaseOrderSettlement.findUnique({ where: { purchaseOrderId } });
          if (existing) return existing;
        }
        if (error?.code === 'P2034' && retry < 2) continue;
        throw error;
      }
    }

    throw new BadRequestException('Settlement could not be completed due to concurrent activity. Please retry.');
  }
}
