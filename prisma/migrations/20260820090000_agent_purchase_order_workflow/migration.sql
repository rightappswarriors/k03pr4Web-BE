-- Agent-side PO workflow: direct notifications, buyer decision audit and payment preparation.
ALTER TABLE "PurchaseOrder"
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod",
  ADD COLUMN IF NOT EXISTS "paymentReference" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentPreparedAt" TIMESTAMP(3);

ALTER TABLE "Notification"
  ALTER COLUMN "orgId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "agentId" TEXT;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Notification_agentId_createdAt_idx"
  ON "Notification"("agentId", "createdAt");
