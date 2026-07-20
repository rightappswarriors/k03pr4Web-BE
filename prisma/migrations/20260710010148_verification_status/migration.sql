-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "verificationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "verificationStatus" "OrgVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
