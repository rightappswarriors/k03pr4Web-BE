-- CreateTable
CREATE TABLE "SupplierItemVariantGroup" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierItemVariantGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierItemVariantOption" (
    "id" TEXT NOT NULL,
    "variantGroupId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "colorHex" TEXT,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SupplierItemVariantOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierItemVariant" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "incomingQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "damagedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "returnedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderLevel" DOUBLE PRECISION,
    "reorderQty" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "image" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierItemVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierItemVariantValue" (
    "variantId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "SupplierItemVariantValue_pkey" PRIMARY KEY ("variantId","optionId")
);

-- CreateIndex
CREATE INDEX "SupplierItemVariantGroup_supplierItemId_idx" ON "SupplierItemVariantGroup"("supplierItemId");

-- CreateIndex
CREATE INDEX "SupplierItemVariantOption_variantGroupId_idx" ON "SupplierItemVariantOption"("variantGroupId");

-- CreateIndex
CREATE INDEX "SupplierItemVariant_supplierItemId_idx" ON "SupplierItemVariant"("supplierItemId");

-- CreateIndex
CREATE INDEX "SupplierItemVariant_supplierItemId_isActive_idx" ON "SupplierItemVariant"("supplierItemId", "isActive");

-- CreateIndex
CREATE INDEX "SupplierItemVariantValue_optionId_idx" ON "SupplierItemVariantValue"("optionId");

-- AddForeignKey
ALTER TABLE "SupplierItemVariantGroup" ADD CONSTRAINT "SupplierItemVariantGroup_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItemVariantOption" ADD CONSTRAINT "SupplierItemVariantOption_variantGroupId_fkey" FOREIGN KEY ("variantGroupId") REFERENCES "SupplierItemVariantGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItemVariant" ADD CONSTRAINT "SupplierItemVariant_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItemVariantValue" ADD CONSTRAINT "SupplierItemVariantValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SupplierItemVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItemVariantValue" ADD CONSTRAINT "SupplierItemVariantValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "SupplierItemVariantOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
