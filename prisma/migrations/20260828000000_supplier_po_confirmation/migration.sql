CREATE TYPE "PurchaseOrderSource" AS ENUM ('DIRECT_ORDER', 'RFQ');
CREATE TYPE "SupplierConfirmation" AS ENUM ('REVIEW_REQUIRED', 'CONFIRMED', 'DECLINED');

ALTER TABLE "PurchaseOrder"
  ADD COLUMN "source" "PurchaseOrderSource" NOT NULL DEFAULT 'DIRECT_ORDER',
  ADD COLUMN "supplierConfirmation" "SupplierConfirmation" NOT NULL DEFAULT 'REVIEW_REQUIRED',
  ADD COLUMN "supplierConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "supplierExpectedDeliveryAt" TIMESTAMP(3),
  ADD COLUMN "supplierNote" TEXT;
