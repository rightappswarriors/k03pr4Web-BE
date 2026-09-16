import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma, PurchaseOrderSettlement, Wallet } from '../generated/prisma/client';
import { PrismaService } from './prisma.service';
import { RealtimeGateway } from '../gateway/realtime.gateway';

const MONEY_TOLERANCE = 0.009;

type SettlementPostingInconsistencyCode =
  | 'SETTLEMENT_POSTING_INCOMPLETE'
  | 'SETTLEMENT_WALLET_MISSING'
  | 'SETTLEMENT_LEDGER_MISSING'
  | 'SETTLEMENT_LEDGER_WRONG_WALLET'
  | 'SETTLEMENT_LEDGER_WRONG_SOURCE'
  | 'SETTLEMENT_LEDGER_WRONG_REFERENCE'
  | 'SETTLEMENT_LEDGER_AMOUNT_MISMATCH'
  | 'SETTLEMENT_LEDGER_STATE_MISMATCH'
  | 'SETTLEMENT_LEDGER_DUPLICATE'
  | 'SETTLEMENT_ENVIRONMENT_MISMATCH'
  | 'ESCROW_LEDGER_MISSING'
  | 'ESCROW_LEDGER_DUPLICATE'
  | 'ESCROW_WRONG_WALLET'
  | 'ESCROW_ENVIRONMENT_MISMATCH'
  | 'ESCROW_AMOUNT_MISMATCH'
  | 'ESCROW_STATE_MISMATCH'
  | 'SETTLEMENT_POSTED_ESCROW_STILL_HELD';

/** Posts the immutable Day 13.1 outcome to the supplier's available wallet. */
@Injectable()
export class SettlementWalletPostingService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeGateway) {}

  private reconciliationRequired(code: SettlementPostingInconsistencyCode, message: string): never {
    throw new BadRequestException({
      code,
      error: 'Settlement wallet posting requires reconciliation.',
      message,
      reconciliationRequired: true,
    });
  }

  private amountsMatch(left: number, right: number) {
    return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= MONEY_TOLERANCE;
  }

  private async validateExistingSettlementPosting(
    tx: Prisma.TransactionClient,
    settlement: PurchaseOrderSettlement,
    expectedWallet: Wallet | null,
  ) {
    if (!settlement.walletPostedAt || settlement.walletLedgerEntryId === null) {
      this.reconciliationRequired(
        'SETTLEMENT_POSTING_INCOMPLETE',
        'The settlement has only part of its wallet-posting metadata.',
      );
    }
    if (!expectedWallet || expectedWallet.deletedAt) {
      this.reconciliationRequired(
        'SETTLEMENT_WALLET_MISSING',
        'The supplier wallet referenced by this settlement is unavailable.',
      );
    }
    if (expectedWallet.orgId !== settlement.supplierOrgId) {
      this.reconciliationRequired(
        'SETTLEMENT_LEDGER_WRONG_WALLET',
        'The settlement posting does not belong to the expected supplier wallet.',
      );
    }
    if (expectedWallet.environment !== settlement.environment) {
      this.reconciliationRequired(
        'SETTLEMENT_ENVIRONMENT_MISMATCH',
        'The supplier wallet environment does not match the settlement environment.',
      );
    }

    const entry = await tx.walletLedgerEntry.findUnique({ where: { id: settlement.walletLedgerEntryId } });
    if (!entry || entry.deletedAt) {
      this.reconciliationRequired(
        'SETTLEMENT_LEDGER_MISSING',
        'The settlement wallet-ledger pointer does not resolve to an active ledger row.',
      );
    }
    if (entry.walletId !== expectedWallet.id) {
      this.reconciliationRequired(
        'SETTLEMENT_LEDGER_WRONG_WALLET',
        'The settlement ledger row belongs to a different wallet.',
      );
    }
    if (entry.sourceType !== 'PURCHASE_ORDER_SETTLEMENT') {
      this.reconciliationRequired(
        'SETTLEMENT_LEDGER_WRONG_SOURCE',
        'The settlement ledger row has the wrong source type.',
      );
    }
    if (entry.referenceId !== settlement.id) {
      this.reconciliationRequired(
        'SETTLEMENT_LEDGER_WRONG_REFERENCE',
        'The settlement ledger row has the wrong reference.',
      );
    }
    if (!this.amountsMatch(entry.amount, settlement.supplierNet)) {
      this.reconciliationRequired(
        'SETTLEMENT_LEDGER_AMOUNT_MISMATCH',
        'The settlement ledger amount does not match supplier net.',
      );
    }
    if (entry.environment !== settlement.environment) {
      this.reconciliationRequired(
        'SETTLEMENT_ENVIRONMENT_MISMATCH',
        'The settlement ledger environment does not match the settlement environment.',
      );
    }
    if (entry.type !== 'CREDIT' || entry.status !== 'AVAILABLE') {
      this.reconciliationRequired(
        'SETTLEMENT_LEDGER_STATE_MISMATCH',
        'The settlement ledger row is not an available credit.',
      );
    }

    const settlementEntries = await tx.walletLedgerEntry.findMany({
      where: { sourceType: 'PURCHASE_ORDER_SETTLEMENT', referenceId: settlement.id, deletedAt: null },
      take: 2,
    });
    if (settlementEntries.length !== 1 || settlementEntries[0].id !== entry.id) {
      this.reconciliationRequired(
        settlementEntries.length > 1 ? 'SETTLEMENT_LEDGER_DUPLICATE' : 'SETTLEMENT_LEDGER_MISSING',
        settlementEntries.length > 1
          ? 'More than one settlement ledger row uses this settlement reference.'
          : 'The settlement ledger pointer and reference candidate do not agree.',
      );
    }

    const escrowEntries = await tx.walletLedgerEntry.findMany({
      where: { sourceType: 'ESCROW_HOLD', referenceId: settlement.paymentTransactionId, deletedAt: null },
      take: 2,
    });
    if (escrowEntries.length === 0) {
      this.reconciliationRequired(
        'ESCROW_LEDGER_MISSING',
        'The matching payment escrow ledger row is unavailable.',
      );
    }
    if (escrowEntries.length > 1) {
      this.reconciliationRequired(
        'ESCROW_LEDGER_DUPLICATE',
        'More than one escrow ledger row uses this payment reference.',
      );
    }

    const escrowHold = escrowEntries[0];
    if (escrowHold.walletId !== expectedWallet.id) {
      this.reconciliationRequired(
        'ESCROW_WRONG_WALLET',
        'The matching payment escrow belongs to a different wallet.',
      );
    }
    if (escrowHold.environment !== settlement.environment) {
      this.reconciliationRequired(
        'ESCROW_ENVIRONMENT_MISMATCH',
        'The payment escrow environment does not match the settlement environment.',
      );
    }
    if (!this.amountsMatch(escrowHold.amount, settlement.supplierNet)) {
      this.reconciliationRequired(
        'ESCROW_AMOUNT_MISMATCH',
        'The payment escrow amount does not match supplier net.',
      );
    }
    if (escrowHold.status === 'HELD') {
      this.reconciliationRequired(
        'SETTLEMENT_POSTED_ESCROW_STILL_HELD',
        'The settlement is posted, but its matching payment escrow is still active.',
      );
    }
    if (escrowHold.type !== 'CREDIT' || escrowHold.status !== 'RELEASED') {
      this.reconciliationRequired(
        'ESCROW_STATE_MISMATCH',
        'The matching payment escrow is not a released escrow credit.',
      );
    }

    return { entry, wallet: expectedWallet, posted: false, settlement };
  }

  async postSettlementToWallet(settlementId: string) {
    for (let retry = 0; retry < 3; retry += 1) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const settlement = await tx.purchaseOrderSettlement.findUnique({ where: { id: settlementId } });
          if (!settlement) throw new BadRequestException('Purchase order settlement not found.');
          if (!Number.isFinite(settlement.supplierNet) || settlement.supplierNet < 0) throw new BadRequestException('Settlement supplier net must not be negative.');
          if (!this.amountsMatch(settlement.grossAmount, settlement.platformFee + settlement.supplierNet)) {
            throw new BadRequestException('Settlement gross amount must equal platform fee plus supplier net.');
          }

          const expectedWallet = await tx.wallet.findUnique({
            where: { orgId_environment: { orgId: settlement.supplierOrgId, environment: settlement.environment } },
          });
          if (settlement.walletLedgerEntryId !== null || settlement.walletPostedAt !== null) {
            return this.validateExistingSettlementPosting(tx, settlement, expectedWallet);
          }

          const existingCandidates = await tx.walletLedgerEntry.findMany({
            where: { sourceType: 'PURCHASE_ORDER_SETTLEMENT', referenceId: settlement.id, deletedAt: null },
            take: 2,
          });
          if (existingCandidates.length > 0) {
            this.reconciliationRequired(
              existingCandidates.length > 1 ? 'SETTLEMENT_LEDGER_DUPLICATE' : 'SETTLEMENT_POSTING_INCOMPLETE',
              existingCandidates.length > 1
                ? 'More than one settlement ledger row uses this settlement reference.'
                : 'A settlement ledger row exists without complete settlement wallet-posting metadata.',
            );
          }

          const wallet = expectedWallet ?? await tx.wallet.upsert({
            where: { orgId_environment: { orgId: settlement.supplierOrgId, environment: settlement.environment } },
            create: { orgId: settlement.supplierOrgId, environment: settlement.environment, currency: 'PHP', balance: 0, heldBalance: 0, updatedAt: new Date() },
            update: {},
          });

          const escrowHold = await tx.walletLedgerEntry.findUnique({
            where: { walletId_sourceType_referenceId: { walletId: wallet.id, sourceType: 'ESCROW_HOLD', referenceId: settlement.paymentTransactionId } },
          });
          if (!escrowHold || escrowHold.deletedAt || escrowHold.status !== 'HELD' || escrowHold.environment !== settlement.environment) {
            throw new BadRequestException('Settlement cannot be posted because its matching escrow hold is unavailable.');
          }
          if (!this.amountsMatch(escrowHold.amount, settlement.supplierNet)) {
            throw new BadRequestException('Settlement net amount does not match its escrow hold; reconciliation is required.');
          }
          if (wallet.heldBalance < settlement.supplierNet) {
            throw new BadRequestException('Wallet held balance cannot cover this settlement; reconciliation is required.');
          }

          const updatedWallet = await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: { increment: settlement.supplierNet },
              heldBalance: { decrement: settlement.supplierNet },
              updatedAt: new Date(),
            },
          });
          const entry = await tx.walletLedgerEntry.create({
            data: { walletId: wallet.id, type: 'CREDIT', sourceType: 'PURCHASE_ORDER_SETTLEMENT', referenceId: settlement.id, amount: settlement.supplierNet, balanceAfter: updatedWallet.balance, status: 'AVAILABLE', environment: settlement.environment },
          });
          await tx.walletLedgerEntry.update({ where: { id: escrowHold.id }, data: { status: 'RELEASED' } });
          await tx.purchaseOrderSettlement.update({ where: { id: settlement.id }, data: { walletPostedAt: new Date(), walletLedgerEntryId: entry.id } });

          if (settlement.platformFee > 0) {
            const platformWallet = await tx.platformWallet.upsert({
              where: { currency_environment: { currency: 'PHP', environment: settlement.environment } },
              create: { currency: 'PHP', environment: settlement.environment, balance: 0, heldBalance: 0, updatedAt: new Date() },
              update: {},
            });
            const existingPlatformPosting = await tx.platformWalletLedgerEntry.findUnique({
              where: { walletId_sourceType_referenceId: { walletId: platformWallet.id, sourceType: 'PURCHASE_ORDER_PLATFORM_FEE', referenceId: settlement.id } },
            });
            if (!existingPlatformPosting) {
              const legacyPaymentPosting = await tx.platformWalletLedgerEntry.findFirst({
                where: { sourceType: 'TRANSACTION_FEE', referenceId: settlement.paymentTransactionId, environment: settlement.environment },
              });
              if (legacyPaymentPosting) {
                if (legacyPaymentPosting.walletId !== platformWallet.id || !this.amountsMatch(legacyPaymentPosting.amount, settlement.platformFee)) {
                  this.reconciliationRequired('SETTLEMENT_LEDGER_AMOUNT_MISMATCH', 'A legacy platform-fee posting does not match this immutable settlement.');
                }
              } else {
                const updatedPlatformWallet = await tx.platformWallet.update({ where: { id: platformWallet.id }, data: { balance: { increment: settlement.platformFee }, updatedAt: new Date() } });
                await tx.platformWalletLedgerEntry.create({
                  data: {
                    id: randomUUID(),
                    walletId: platformWallet.id,
                    type: 'CREDIT',
                    sourceType: 'PURCHASE_ORDER_PLATFORM_FEE',
                    referenceId: settlement.id,
                    paymentTransactionId: settlement.paymentTransactionId,
                    amount: settlement.platformFee,
                    balanceAfter: updatedPlatformWallet.balance,
                    description: 'Kompra platform fee from immutable purchase order settlement.',
                    environment: settlement.environment,
                  },
                });
              }
            }
          }
          return { entry, wallet: updatedWallet, posted: true, settlement };
        }, { isolationLevel: 'Serializable' });
        if (result.posted) this.realtime.emitToOrganization(result.settlement.supplierOrgId, 'wallet:updated', { walletId: result.wallet.id, balance: result.wallet.balance, environment: result.settlement.environment, settlementId: result.settlement.id });
        return result;
      } catch (error: any) {
        if ((error?.code === 'P2034' || error?.code === 'P2002') && retry < 2) continue;
        console.error('[Settlement wallet posting failed]', { settlementId, code: error?.code, message: error?.message });
        throw error;
      }
    }
    throw new BadRequestException('Settlement wallet posting could not be completed due to concurrent activity.');
  }
}
