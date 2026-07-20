-- CreateEnum
CREATE TYPE "ScheduledPriceStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "SupplierItem" ADD COLUMN     "currentCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SupplierScheduledPrice" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" "ScheduledPriceStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierScheduledPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierScheduledPrice_supplierItemId_status_idx" ON "SupplierScheduledPrice"("supplierItemId", "status");

-- CreateIndex
CREATE INDEX "SupplierScheduledPrice_effectiveAt_status_idx" ON "SupplierScheduledPrice"("effectiveAt", "status");

-- AddForeignKey
ALTER TABLE "SupplierScheduledPrice" ADD CONSTRAINT "SupplierScheduledPrice_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
