DO $$ BEGIN
  CREATE TYPE "DeliveryDateAgreementStatus" AS ENUM ('PENDING_SUPPLIER', 'PENDING_BUYER', 'AGREED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "PurchaseOrder"
  ADD COLUMN IF NOT EXISTS "deliveryDateAgreementStatus" "DeliveryDateAgreementStatus" NOT NULL DEFAULT 'PENDING_SUPPLIER',
  ADD COLUMN IF NOT EXISTS "deliveryDateAgreedAt" TIMESTAMP(3);
