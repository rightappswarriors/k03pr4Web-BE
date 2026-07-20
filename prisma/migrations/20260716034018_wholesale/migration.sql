/*
  Warnings:

  - Added the required column `updatedAt` to the `PriceTier` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WholesaleDocType" AS ENUM ('CE', 'FDA', 'ISO', 'ROHS', 'MSDS', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierCapabilityType" AS ENUM ('MINOR_CUSTOMIZATION', 'DRAWING_CUSTOMIZATION', 'SAMPLE_CUSTOMIZATION', 'FULL_CUSTOMIZATION', 'OEM', 'ODM');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'SUPPLIER';
ALTER TYPE "Role" ADD VALUE 'CUSTOMER';

-- AlterTable
ALTER TABLE "PriceTier" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'PHP',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "maxQty" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SupplierItem" ADD COLUMN     "leadTime" TEXT,
ADD COLUMN     "sampleAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "samplePrice" DOUBLE PRECISION,
ADD COLUMN     "shippingFrom" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "SupplierCapability" (
    "id" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "type" "SupplierCapabilityType" NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesaleCustomization" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "minimumQuantity" INTEGER NOT NULL,
    "additionalCost" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WholesaleCustomization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesaleQuote" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT,
    "quantity" TEXT NOT NULL,
    "targetPrice" TEXT,
    "quotedPrice" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "expiryDate" TIMESTAMP(3),
    "submittedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WholesaleQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesaleShipping" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "originCountry" TEXT,
    "originProvince" TEXT,
    "originCity" TEXT,
    "shippingMethod" TEXT,
    "estimatedDays" INTEGER,
    "shippingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WholesaleShipping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductWholesaleSettings" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "minimumOrderQty" INTEGER,
    "sampleAvailable" BOOLEAN NOT NULL DEFAULT false,
    "samplePrice" DOUBLE PRECISION,
    "leadTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductWholesaleSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpecification" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "category" TEXT,
    "groupName" TEXT,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesaleDocument" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "title" TEXT,
    "type" "WholesaleDocType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" INTEGER,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WholesaleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesalePackaging" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "sellingUnit" TEXT,
    "packageLength" DOUBLE PRECISION,
    "packageWidth" DOUBLE PRECISION,
    "packageHeight" DOUBLE PRECISION,
    "grossWeight" DOUBLE PRECISION,
    "netWeight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WholesalePackaging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProfile" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "productCategories" TEXT[],
    "taxId" TEXT,
    "businessRegNumber" TEXT,
    "businessDocuments" TEXT[],
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "zipCode" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "zipCode" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierCapability_organizationId_idx" ON "SupplierCapability"("organizationId");

-- CreateIndex
CREATE INDEX "WholesaleCustomization_supplierItemId_idx" ON "WholesaleCustomization"("supplierItemId");

-- CreateIndex
CREATE INDEX "WholesaleQuote_productId_idx" ON "WholesaleQuote"("productId");

-- CreateIndex
CREATE INDEX "WholesaleQuote_status_idx" ON "WholesaleQuote"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WholesaleShipping_supplierItemId_key" ON "WholesaleShipping"("supplierItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductWholesaleSettings_supplierItemId_key" ON "ProductWholesaleSettings"("supplierItemId");

-- CreateIndex
CREATE INDEX "ProductSpecification_supplierItemId_sortOrder_idx" ON "ProductSpecification"("supplierItemId", "sortOrder");

-- CreateIndex
CREATE INDEX "WholesaleDocument_supplierItemId_idx" ON "WholesaleDocument"("supplierItemId");

-- CreateIndex
CREATE INDEX "WholesaleDocument_verified_idx" ON "WholesaleDocument"("verified");

-- CreateIndex
CREATE UNIQUE INDEX "WholesalePackaging_supplierItemId_key" ON "WholesalePackaging"("supplierItemId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProfile_email_key" ON "SupplierProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProfile_userId_key" ON "SupplierProfile"("userId");

-- CreateIndex
CREATE INDEX "SupplierProfile_status_idx" ON "SupplierProfile"("status");

-- CreateIndex
CREATE INDEX "SupplierProfile_email_idx" ON "SupplierProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");

-- CreateIndex
CREATE INDEX "PriceTier_supplierItemId_idx" ON "PriceTier"("supplierItemId");

-- AddForeignKey
ALTER TABLE "SupplierCapability" ADD CONSTRAINT "SupplierCapability_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleCustomization" ADD CONSTRAINT "WholesaleCustomization_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleQuote" ADD CONSTRAINT "WholesaleQuote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SupplierItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleShipping" ADD CONSTRAINT "WholesaleShipping_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductWholesaleSettings" ADD CONSTRAINT "ProductWholesaleSettings_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpecification" ADD CONSTRAINT "ProductSpecification_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleDocument" ADD CONSTRAINT "WholesaleDocument_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleDocument" ADD CONSTRAINT "WholesaleDocument_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesalePackaging" ADD CONSTRAINT "WholesalePackaging_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProfile" ADD CONSTRAINT "SupplierProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
