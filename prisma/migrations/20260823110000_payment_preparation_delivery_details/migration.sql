-- Both applications use the same database. This migration is owned here and
-- must be applied once only.
ALTER TABLE "Delivery"
  ADD COLUMN IF NOT EXISTS "recipientName" TEXT,
  ADD COLUMN IF NOT EXISTS "recipientContact" TEXT;

-- Day 10 does not process money. Legacy PO rows that were marked PAID without
-- a verifiable payment timestamp are returned to their preparation state.
UPDATE "PurchaseOrder"
SET "paymentStatus" = CASE WHEN "paymentPreparedAt" IS NULL THEN 'PENDING'::"PaymentStatus" ELSE 'PREPARING'::"PaymentStatus" END
WHERE "paymentStatus" = 'PAID'::"PaymentStatus"
  AND ("receiptSnapshot" IS NULL OR "receiptSnapshot"->>'paidAt' IS NULL);
