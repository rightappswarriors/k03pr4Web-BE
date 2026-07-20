-- CreateTable
CREATE TABLE "SupplierItemImage" (
    "id" SERIAL NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierItemImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierItemVariantImage" (
    "id" SERIAL NOT NULL,
    "supplierItemVariantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierItemVariantImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierItemReviewImage" (
    "id" SERIAL NOT NULL,
    "supplierItemReviewId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierItemReviewImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierItemImage_supplierItemId_sortOrder_idx" ON "SupplierItemImage"("supplierItemId", "sortOrder");

-- CreateIndex
CREATE INDEX "SupplierItemVariantImage_supplierItemVariantId_sortOrder_idx" ON "SupplierItemVariantImage"("supplierItemVariantId", "sortOrder");

-- CreateIndex
CREATE INDEX "SupplierItemReviewImage_supplierItemReviewId_sortOrder_idx" ON "SupplierItemReviewImage"("supplierItemReviewId", "sortOrder");

-- AddForeignKey
ALTER TABLE "SupplierItemImage" ADD CONSTRAINT "SupplierItemImage_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItemVariantImage" ADD CONSTRAINT "SupplierItemVariantImage_supplierItemVariantId_fkey" FOREIGN KEY ("supplierItemVariantId") REFERENCES "SupplierItemVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItemReviewImage" ADD CONSTRAINT "SupplierItemReviewImage_supplierItemReviewId_fkey" FOREIGN KEY ("supplierItemReviewId") REFERENCES "SupplierItemReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
