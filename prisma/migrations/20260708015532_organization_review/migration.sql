-- DropForeignKey
ALTER TABLE "OrganizationReview" DROP CONSTRAINT "OrganizationReview_reviewerOrgId_fkey";

-- AddForeignKey
ALTER TABLE "OrganizationReview" ADD CONSTRAINT "OrganizationReview_reviewerOrgId_fkey" FOREIGN KEY ("reviewerOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
