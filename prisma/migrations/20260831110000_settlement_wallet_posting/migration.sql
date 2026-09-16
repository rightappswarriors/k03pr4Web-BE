ALTER TYPE "LedgerSourceType" ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_SETTLEMENT';

ALTER TABLE "Wallet" ADD COLUMN IF NOT EXISTS "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION';
ALTER TABLE "PurchaseOrderSettlement" ADD COLUMN IF NOT EXISTS "walletPostedAt" TIMESTAMP(3);
ALTER TABLE "PurchaseOrderSettlement" ADD COLUMN IF NOT EXISTS "walletLedgerEntryId" INTEGER;

ALTER TABLE "Wallet" DROP CONSTRAINT IF EXISTS "Wallet_orgId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_orgId_environment_key" ON "Wallet"("orgId", "environment");
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrderSettlement_walletLedgerEntryId_key" ON "PurchaseOrderSettlement"("walletLedgerEntryId");
