-- RFQs remain negotiation records; the resulting purchase order owns all
-- financial, line-item and delivery data.
ALTER TYPE "RfqStatus" ADD VALUE IF NOT EXISTS 'PENDING_SUPPLIER_RESPONSE';
ALTER TYPE "RfqStatus" ADD VALUE IF NOT EXISTS 'COUNTER_OFFERED';
ALTER TYPE "RfqStatus" ADD VALUE IF NOT EXISTS 'AGENT_ACCEPTED_FINAL';
ALTER TYPE "RfqStatus" ADD VALUE IF NOT EXISTS 'SUPPLIER_ACCEPTED_FINAL';

ALTER TABLE "RequestForQuotation"
  ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "RequestForQuotation_purchaseOrderId_key"
  ON "RequestForQuotation"("purchaseOrderId");

DO $$ BEGIN
  ALTER TABLE "RequestForQuotation"
    ADD CONSTRAINT "RequestForQuotation_purchaseOrderId_fkey"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
