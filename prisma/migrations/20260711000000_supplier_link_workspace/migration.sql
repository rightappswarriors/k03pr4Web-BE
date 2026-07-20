-- Promote the existing supplier/outlet approval record into a relationship workspace.
CREATE TYPE "SupplierLinkStatus" AS ENUM ('SUGGESTED', 'REQUESTED', 'PENDING', 'ACCEPTED', 'ACTIVE', 'PAUSED', 'BLOCKED', 'ARCHIVED');

ALTER TABLE "SupplierOutletLink"
  ADD COLUMN "status" "SupplierLinkStatus" NOT NULL DEFAULT 'REQUESTED',
  ADD COLUMN "assignedAgentId" TEXT,
  ADD COLUMN "preferredWarehouseId" TEXT,
  ADD COLUMN "deliveryInstructions" TEXT,
  ADD COLUMN "receivingHours" TEXT,
  ADD COLUMN "creditTerms" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "linkedAt" TIMESTAMP(3),
  ADD COLUMN "pausedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "SupplierOutletLink"
SET "status" = CASE WHEN "isApproved" THEN 'ACTIVE'::"SupplierLinkStatus" ELSE 'REQUESTED'::"SupplierLinkStatus" END,
    "linkedAt" = CASE WHEN "isApproved" THEN "createdAt" ELSE NULL END;

CREATE INDEX "SupplierOutletLink_supplierOrgId_status_idx" ON "SupplierOutletLink"("supplierOrgId", "status");
CREATE INDEX "SupplierOutletLink_outletId_status_idx" ON "SupplierOutletLink"("outletId", "status");
CREATE INDEX "SupplierOutletLink_assignedAgentId_idx" ON "SupplierOutletLink"("assignedAgentId");
ALTER TABLE "SupplierOutletLink" ADD CONSTRAINT "SupplierOutletLink_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
