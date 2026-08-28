ALTER TYPE "PaymentTransactionStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_one_open_purchase_order_attempt_key"
  ON "PaymentTransaction" ("relatedId")
  WHERE "relatedType" = 'PURCHASE_ORDER'
    AND "deletedAt" IS NULL
    AND status IN ('PENDING', 'AWAITING_PAYMENT', 'PROCESSING');

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_one_confirmed_purchase_order_payment_key"
  ON "PaymentTransaction" ("relatedId")
  WHERE "relatedType" = 'PURCHASE_ORDER'
    AND "deletedAt" IS NULL
    AND status = 'SUCCEEDED';
