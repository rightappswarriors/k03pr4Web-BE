import 'dotenv/config';
import { PrismaService } from '../src/services/prisma.service';
import { SettlementWalletPostingService } from '../src/services/settlement-wallet-posting.service';

const settlementIdIndex = process.argv.indexOf('--settlement-id');
const settlementId = settlementIdIndex >= 0 ? process.argv[settlementIdIndex + 1] : undefined;
if (!settlementId || process.argv.length !== 4) {
  throw new Error('Usage: npx tsx scripts/retry-settlement-wallet-posting.ts --settlement-id <id>');
}

const prisma = new PrismaService();
const realtime = { emitToOrganization: () => undefined } as any;
const posting = new SettlementWalletPostingService(prisma, realtime);

async function snapshot(label: string) {
  const settlement = await prisma.purchaseOrderSettlement.findUniqueOrThrow({ where: { id: settlementId } });
  const wallet = await prisma.wallet.findUnique({ where: { orgId_environment: { orgId: settlement.supplierOrgId, environment: settlement.environment } } });
  const ledgerCount = wallet ? await prisma.walletLedgerEntry.count({ where: { walletId: wallet.id, sourceType: 'PURCHASE_ORDER_SETTLEMENT', referenceId: settlement.id } }) : 0;
  console.log(label, { settlementId: settlement.id, walletPostedAt: settlement.walletPostedAt, walletLedgerEntryId: settlement.walletLedgerEntryId, balance: wallet?.balance ?? 0, heldBalance: wallet?.heldBalance ?? 0, settlementLedgerCount: ledgerCount });
}

async function main() {
  await prisma.$connect();
  await snapshot('Before');
  await posting.postSettlementToWallet(settlementId);
  await snapshot('After');
}

main().finally(() => prisma.$disconnect());
