-- AlterTable
ALTER TABLE "SupplierItem" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "SupplierItemCategory" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierItemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierItemGroup" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierItemGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierItemCategory_catalogId_name_key" ON "SupplierItemCategory"("catalogId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierItemGroup_catalogId_name_key" ON "SupplierItemGroup"("catalogId", "name");

-- AddForeignKey
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SupplierItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SupplierItemGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItemCategory" ADD CONSTRAINT "SupplierItemCategory_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "SupplierCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItemGroup" ADD CONSTRAINT "SupplierItemGroup_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "SupplierCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
