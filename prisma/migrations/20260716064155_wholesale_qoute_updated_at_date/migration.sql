-- AlterTable
ALTER TABLE "ProductSpecification" ALTER COLUMN "updatedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProductWholesaleSettings" ALTER COLUMN "updatedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WholesaleCustomization" ALTER COLUMN "updatedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WholesaleQuote" ALTER COLUMN "updatedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WholesaleShipping" ALTER COLUMN "updatedAt" DROP NOT NULL;
