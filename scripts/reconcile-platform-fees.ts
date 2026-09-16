import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const environmentArg = process.argv.find((value) => value.startsWith('--environment='));
const environment = (environmentArg?.split('=')[1] ?? 'SANDBOX').toUpperCase();
if (!['SANDBOX', 'PRODUCTION'].includes(environment)) throw new Error('Use --environment=SANDBOX or --environment=PRODUCTION.');
const apply = process.argv.includes('--apply');
const confirmation = process.argv.find((value) => value.startsWith('--confirm='))?.split('=')[1];
if (apply && (environment !== 'SANDBOX' || confirmation !== 'POST_PLATFORM_FEES_SANDBOX')) {
  throw new Error('Apply is restricted to SANDBOX and requires --confirm=POST_PLATFORM_FEES_SANDBOX.');
}
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function eligible() {
  const settlements = await prisma.purchaseOrderSettlement.findMany({
    where: { environment: environment as any, status: 'SETTLED', walletPostedAt: { not: null }, platformFee: { gt: 0 } },
    orderBy: { settledAt: 'asc' },
  });
  const proposals = [];
  for (const settlement of settlements) {
    const [supplierEntry, posted, legacy] = await Promise.all([
      prisma.walletLedgerEntry.findFirst({ where: { sourceType: 'PURCHASE_ORDER_SETTLEMENT', referenceId: settlement.id, environment: settlement.environment, status: 'AVAILABLE', deletedAt: null } }),
      prisma.platformWalletLedgerEntry.findFirst({ where: { sourceType: 'PURCHASE_ORDER_PLATFORM_FEE', referenceId: settlement.id, environment: settlement.environment } }),
      prisma.platformWalletLedgerEntry.findFirst({ where: { sourceType: 'TRANSACTION_FEE', referenceId: settlement.paymentTransactionId, environment: settlement.environment } }),
    ]);
    const consistent = Boolean(
      supplierEntry
      && supplierEntry.id === settlement.walletLedgerEntryId
      && Math.abs(supplierEntry.amount - settlement.supplierNet) <= 0.009
      && Math.abs(settlement.grossAmount - settlement.platformFee - settlement.supplierNet) <= 0.009
    );
    proposals.push({ settlement, consistent, alreadyPosted: Boolean(posted || legacy), legacy: Boolean(legacy) });
  }
  return proposals;
}

async function main() {
  const proposals = await eligible();
  const candidates = proposals.filter((item) => item.consistent && !item.alreadyPosted);
  console.log(JSON.stringify({
    mode: apply ? 'APPLY' : 'DRY_RUN',
    environment,
    settlementsScanned: proposals.length,
    alreadyPosted: proposals.filter((item) => item.alreadyPosted).length,
    inconsistentSupplierPosting: proposals.filter((item) => !item.consistent).length,
    proposedCredits: candidates.map(({ settlement }) => ({ settlementId: settlement.id, purchaseOrderId: settlement.purchaseOrderId, paymentTransactionId: settlement.paymentTransactionId, amount: settlement.platformFee })),
    proposedTotal: candidates.reduce((sum, item) => sum + item.settlement.platformFee, 0),
  }, null, 2));
  if (!apply) return;
  for (const { settlement } of candidates) {
    await prisma.$transaction(async (tx) => {
      const duplicate = await tx.platformWalletLedgerEntry.findFirst({ where: { OR: [
        { sourceType: 'PURCHASE_ORDER_PLATFORM_FEE', referenceId: settlement.id, environment: settlement.environment },
        { sourceType: 'TRANSACTION_FEE', referenceId: settlement.paymentTransactionId, environment: settlement.environment },
      ] } });
      if (duplicate) return;
      const supplierEntry = await tx.walletLedgerEntry.findFirst({ where: { id: settlement.walletLedgerEntryId ?? -1, sourceType: 'PURCHASE_ORDER_SETTLEMENT', referenceId: settlement.id, status: 'AVAILABLE', environment: settlement.environment, deletedAt: null } });
      if (!supplierEntry || Math.abs(supplierEntry.amount - settlement.supplierNet) > 0.009) throw new Error(`Settlement ${settlement.id} supplier posting changed during apply.`);
      const wallet = await tx.platformWallet.upsert({ where: { currency_environment: { currency: 'PHP', environment: settlement.environment } }, create: { currency: 'PHP', environment: settlement.environment, balance: 0, heldBalance: 0, updatedAt: new Date() }, update: {} });
      const updated = await tx.platformWallet.update({ where: { id: wallet.id }, data: { balance: { increment: settlement.platformFee }, updatedAt: new Date() } });
      await tx.platformWalletLedgerEntry.create({ data: { id: randomUUID(), walletId: wallet.id, type: 'CREDIT', sourceType: 'PURCHASE_ORDER_PLATFORM_FEE', referenceId: settlement.id, paymentTransactionId: settlement.paymentTransactionId, amount: settlement.platformFee, balanceAfter: updated.balance, description: 'Controlled historical platform-fee settlement backfill.', environment: settlement.environment } });
    }, { isolationLevel: 'Serializable' });
  }
  console.log(`Applied ${candidates.length} idempotent SANDBOX platform-fee postings.`);
}

main().finally(() => prisma.$disconnect());

