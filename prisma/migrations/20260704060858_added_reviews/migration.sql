-- CreateTable
CREATE TABLE "SupplierItemReview" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "reviewerOrgId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupplierItemReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationReview" (
    "id" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "reviewerOrgId" INTEGER,
    "reviewerCustomerId" INTEGER,
    "reviewerName" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "isVerifiedTransaction" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierItemReview_supplierItemId_idx" ON "SupplierItemReview"("supplierItemId");

-- CreateIndex
CREATE INDEX "SupplierItemReview_reviewerOrgId_idx" ON "SupplierItemReview"("reviewerOrgId");

-- CreateIndex
CREATE INDEX "SupplierItemReview_rating_idx" ON "SupplierItemReview"("rating");

-- CreateIndex
CREATE INDEX "OrganizationReview_organizationId_idx" ON "OrganizationReview"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationReview_reviewerOrgId_idx" ON "OrganizationReview"("reviewerOrgId");

-- CreateIndex
CREATE INDEX "OrganizationReview_reviewerCustomerId_idx" ON "OrganizationReview"("reviewerCustomerId");

-- CreateIndex
CREATE INDEX "OrganizationReview_rating_idx" ON "OrganizationReview"("rating");

-- AddForeignKey
ALTER TABLE "SupplierItemReview" ADD CONSTRAINT "SupplierItemReview_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItemReview" ADD CONSTRAINT "SupplierItemReview_reviewerOrgId_fkey" FOREIGN KEY ("reviewerOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationReview" ADD CONSTRAINT "OrganizationReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationReview" ADD CONSTRAINT "OrganizationReview_reviewerOrgId_fkey" FOREIGN KEY ("reviewerOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
