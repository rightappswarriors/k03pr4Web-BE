-- AlterTable
ALTER TABLE "SupplierCatalog" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SupplierItem" ADD COLUMN     "deletedAt" TIMESTAMP(3);
