ALTER TYPE "PaymentTransactionStatus" ADD VALUE IF NOT EXISTS 'RECONCILIATION_REQUIRED';

DROP INDEX IF EXISTS "PaymentTransaction_one_open_purchase_order_attempt_key";

CREATE UNIQUE INDEX "PaymentTransaction_one_open_purchase_order_attempt_key"
  ON "PaymentTransaction" ("relatedId")
  WHERE "relatedType" = 'PURCHASE_ORDER'
    AND "deletedAt" IS NULL
    AND status IN ('PENDING', 'AWAITING_PAYMENT', 'PROCESSING', 'RECONCILIATION_REQUIRED');
