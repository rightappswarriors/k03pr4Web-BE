DO $$ BEGIN
  CREATE TYPE "PurchaseOrderSettlementStatus" AS ENUM ('SETTLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PurchaseOrderSettlement" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "paymentTransactionId" TEXT NOT NULL,
  "supplierOrgId" INTEGER NOT NULL,
  "grossAmount" DOUBLE PRECISION NOT NULL,
  "platformFee" DOUBLE PRECISION NOT NULL,
  "supplierNet" DOUBLE PRECISION NOT NULL,
  "feeRuleId" TEXT NOT NULL,
  "feeSnapshot" JSONB NOT NULL,
  "environment" "Environment" NOT NULL,
  "status" "PurchaseOrderSettlementStatus" NOT NULL DEFAULT 'SETTLED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PurchaseOrderSettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrderSettlement_purchaseOrderId_key" ON "PurchaseOrderSettlement"("purchaseOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrderSettlement_paymentTransactionId_key" ON "PurchaseOrderSettlement"("paymentTransactionId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderSettlement_supplierOrgId_environment_idx" ON "PurchaseOrderSettlement"("supplierOrgId", "environment");
CREATE INDEX IF NOT EXISTS "PurchaseOrderSettlement_environment_settledAt_idx" ON "PurchaseOrderSettlement"("environment", "settledAt");
