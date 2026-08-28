ALTER TYPE "FeeApplication" ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER';
ALTER TYPE "PaymentRelatedType" ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER';
ALTER TYPE "PaymentTransactionStatus" ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT';
ALTER TYPE "PaymentTransactionStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "PaymentTransactionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "PaymentTransaction"
  ADD COLUMN IF NOT EXISTS "providerFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "supplierOrgId" INTEGER,
  ADD COLUMN IF NOT EXISTS "feeRuleId" TEXT,
  ADD COLUMN IF NOT EXISTS "feeSnapshot" JSONB;

CREATE INDEX IF NOT EXISTS "PaymentTransaction_relatedType_relatedId_status_idx"
  ON "PaymentTransaction" ("relatedType", "relatedId", "status");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_feeRuleId_idx"
  ON "PaymentTransaction" ("feeRuleId");
CREATE UNIQUE INDEX IF NOT EXISTS "WalletLedgerEntry_walletId_sourceType_referenceId_key"
  ON "WalletLedgerEntry" ("walletId", "sourceType", "referenceId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentTransaction_feeRuleId_fkey') THEN
    ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_feeRuleId_fkey"
      FOREIGN KEY ("feeRuleId") REFERENCES "FeeRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
