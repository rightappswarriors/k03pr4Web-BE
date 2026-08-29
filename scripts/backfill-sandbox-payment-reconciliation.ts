import 'dotenv/config';
import { PrismaService } from '../src/services/prisma.service';
import { SandboxPaymentReconciliationService } from '../src/services/payments/sandbox-payment-reconciliation.service';

const argumentValue = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const transactionId = argumentValue('--transaction-id');
const amountArg = argumentValue('--amount');
const apply = process.argv.includes('--apply');

if (!transactionId && !amountArg) {
  throw new Error('Provide --transaction-id <id> to backfill, or --amount <amount> to inspect candidates.');
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();

  try {
  if (!transactionId) {
    const amount = Number(amountArg);
    if (!Number.isFinite(amount)) throw new Error('Amount must be numeric.');
    const candidates = await prisma.paymentTransaction.findMany({
      where: { amount, provider: 'PAYMAYA', environment: 'SANDBOX', relatedType: 'PURCHASE_ORDER', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, amount: true, gatewayReference: true, feeSnapshot: true, relatedId: true, createdAt: true, updatedAt: true },
    });
    console.info(JSON.stringify(candidates.map((payment) => {
      const snapshot = payment.feeSnapshot as Record<string, unknown> | null;
      return {
        id: payment.id, status: payment.status, amount: payment.amount, relatedId: payment.relatedId, gatewayReference: payment.gatewayReference, createdAt: payment.createdAt, updatedAt: payment.updatedAt,
        sandboxWebhookEvidence: snapshot?.sandboxWebhookEvidence ?? null,
        providerVerification: snapshot?.providerVerification ?? null,
      };
    }), null, 2));
  } else {
    if (!apply) throw new Error('Inspection is complete. Re-run with --apply to attempt the evidence-validated backfill.');
    const service = new SandboxPaymentReconciliationService(prisma, undefined as any);
    const result = await service.backfillReconciliationRequired(transactionId);
    console.info(JSON.stringify({ id: result.payment.id, status: result.payment.status, transitioned: result.transitioned, reason: result.reason ?? null }));
  }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
