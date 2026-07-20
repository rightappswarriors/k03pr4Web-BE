/*
  Warnings:

  - You are about to drop the column `outletId` on the `PurchaseOrder` table. All the data in the column will be lost.
  - Added the required column `deliveryOutletId` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MarketplaceListingStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'SUSPENDED', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MARKETPLACE_PUBLISH';
ALTER TYPE "AuditAction" ADD VALUE 'MARKETPLACE_UNPUBLISH';

-- DropForeignKey
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_outletId_fkey";

-- AlterTable
ALTER TABLE "PurchaseOrder" DROP COLUMN "outletId",
ADD COLUMN     "deliveryOutletId" INTEGER NOT NULL,
ADD COLUMN     "supplierOrganizationLinkId" TEXT;

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "status" "MarketplaceListingStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "unpublishedAt" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "searchRank" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "inquiries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierOrganizationLink" (
    "id" TEXT NOT NULL,
    "supplierOrgId" INTEGER NOT NULL,
    "retailerOrgId" INTEGER NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "status" "SupplierLinkStatus" NOT NULL DEFAULT 'REQUESTED',
    "assignedAgentId" TEXT,
    "preferredWarehouseId" TEXT,
    "deliveryInstructions" TEXT,
    "receivingHours" TEXT,
    "creditTerms" TEXT,
    "notes" TEXT,
    "linkedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierOrganizationLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceListing_supplierItemId_key" ON "MarketplaceListing"("supplierItemId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_status_idx" ON "MarketplaceListing"("status");

-- CreateIndex
CREATE INDEX "MarketplaceListing_supplierItemId_idx" ON "MarketplaceListing"("supplierItemId");

-- CreateIndex
CREATE INDEX "SupplierOrganizationLink_supplierOrgId_status_idx" ON "SupplierOrganizationLink"("supplierOrgId", "status");

-- CreateIndex
CREATE INDEX "SupplierOrganizationLink_retailerOrgId_status_idx" ON "SupplierOrganizationLink"("retailerOrgId", "status");

-- CreateIndex
CREATE INDEX "SupplierOrganizationLink_assignedAgentId_idx" ON "SupplierOrganizationLink"("assignedAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierOrganizationLink_supplierOrgId_retailerOrgId_key" ON "SupplierOrganizationLink"("supplierOrgId", "retailerOrgId");

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierOrganizationLinkId_fkey" FOREIGN KEY ("supplierOrganizationLinkId") REFERENCES "SupplierOrganizationLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_deliveryOutletId_fkey" FOREIGN KEY ("deliveryOutletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOrganizationLink" ADD CONSTRAINT "SupplierOrganizationLink_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOrganizationLink" ADD CONSTRAINT "SupplierOrganizationLink_retailerOrgId_fkey" FOREIGN KEY ("retailerOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOrganizationLink" ADD CONSTRAINT "SupplierOrganizationLink_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
