CREATE TYPE "DeliveryDateAgreementMethod" AS ENUM (
  'BUYER_ACCEPTED',
  'SUPPLIER_ACCEPTED',
  'AUTO_BUYER_TIMEOUT'
);

ALTER TABLE "PurchaseOrder"
  ADD COLUMN "deliveryDateResponseDeadlineAt" TIMESTAMP(3),
  ADD COLUMN "deliveryDateProposalVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryDateAgreementMethod" "DeliveryDateAgreementMethod";

CREATE INDEX "PurchaseOrder_deliveryDateAgreementStatus_deliveryDateResponseDeadlineAt_idx"
  ON "PurchaseOrder"("deliveryDateAgreementStatus", "deliveryDateResponseDeadlineAt");
