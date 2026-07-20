-- CreateEnum
CREATE TYPE "SupplierStockBatchStatus" AS ENUM ('ACTIVE', 'DEPLETED', 'EXPIRED', 'DAMAGED');

-- CreateEnum
CREATE TYPE "SupplierInventoryMovementType" AS ENUM ('RECEIVED', 'SOLD', 'RESERVED', 'RELEASED', 'TRANSFERRED_OUT', 'TRANSFERRED_IN', 'ADJUSTED', 'RETURNED', 'DAMAGED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SupplierIncomingStatus" AS ENUM ('PENDING', 'RECEIVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "SupplierItem" ADD COLUMN     "damagedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "incomingQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reorderLevel" DOUBLE PRECISION,
ADD COLUMN     "reorderQty" DOUBLE PRECISION,
ADD COLUMN     "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "returnedQty" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SupplierWarehouse" (
    "id" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierWarehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierStockBatch" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "batchNumber" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "remainingQty" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SupplierStockBatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierStockBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierInventoryMovement" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "batchId" TEXT,
    "type" "SupplierInventoryMovementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "quantityBefore" DOUBLE PRECISION NOT NULL,
    "quantityAfter" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "transferGroupId" TEXT,
    "reason" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierInventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierIncomingStock" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "expectedQty" DOUBLE PRECISION NOT NULL,
    "expectedDate" TIMESTAMP(3),
    "sourceLabel" TEXT,
    "status" "SupplierIncomingStatus" NOT NULL DEFAULT 'PENDING',
    "receivedBatchId" TEXT,
    "notes" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierIncomingStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierItemPriceHistory" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "oldPrice" DOUBLE PRECISION NOT NULL,
    "newPrice" DOUBLE PRECISION NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" INTEGER,
    "reason" TEXT,

    CONSTRAINT "SupplierItemPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierItemCostHistory" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "oldCost" DOUBLE PRECISION NOT NULL,
    "newCost" DOUBLE PRECISION NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" INTEGER,
    "reason" TEXT,

    CONSTRAINT "SupplierItemCostHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierWarehouse_organizationId_idx" ON "SupplierWarehouse"("organizationId");

-- CreateIndex
CREATE INDEX "SupplierStockBatch_supplierItemId_status_idx" ON "SupplierStockBatch"("supplierItemId", "status");

-- CreateIndex
CREATE INDEX "SupplierStockBatch_supplierItemId_expiryDate_idx" ON "SupplierStockBatch"("supplierItemId", "expiryDate");

-- CreateIndex
CREATE INDEX "SupplierStockBatch_warehouseId_idx" ON "SupplierStockBatch"("warehouseId");

-- CreateIndex
CREATE INDEX "SupplierInventoryMovement_supplierItemId_createdAt_idx" ON "SupplierInventoryMovement"("supplierItemId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierInventoryMovement_supplierItemId_type_idx" ON "SupplierInventoryMovement"("supplierItemId", "type");

-- CreateIndex
CREATE INDEX "SupplierInventoryMovement_transferGroupId_idx" ON "SupplierInventoryMovement"("transferGroupId");

-- CreateIndex
CREATE INDEX "SupplierIncomingStock_supplierItemId_status_idx" ON "SupplierIncomingStock"("supplierItemId", "status");

-- CreateIndex
CREATE INDEX "SupplierItemPriceHistory_supplierItemId_effectiveAt_idx" ON "SupplierItemPriceHistory"("supplierItemId", "effectiveAt");

-- AddForeignKey
ALTER TABLE "SupplierWarehouse" ADD CONSTRAINT "SupplierWarehouse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierStockBatch" ADD CONSTRAINT "SupplierStockBatch_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierStockBatch" ADD CONSTRAINT "SupplierStockBatch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "SupplierWarehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInventoryMovement" ADD CONSTRAINT "SupplierInventoryMovement_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInventoryMovement" ADD CONSTRAINT "SupplierInventoryMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "SupplierWarehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInventoryMovement" ADD CONSTRAINT "SupplierInventoryMovement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "SupplierStockBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierIncomingStock" ADD CONSTRAINT "SupplierIncomingStock_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierIncomingStock" ADD CONSTRAINT "SupplierIncomingStock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "SupplierWarehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItemPriceHistory" ADD CONSTRAINT "SupplierItemPriceHistory_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItemCostHistory" ADD CONSTRAINT "SupplierItemCostHistory_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
