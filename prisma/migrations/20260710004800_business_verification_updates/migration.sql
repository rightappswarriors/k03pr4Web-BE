/*
  Warnings:

  - You are about to drop the `BusinessVerification` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OrgVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "BusinessVerification" DROP CONSTRAINT "BusinessVerification_orgId_fkey";

-- DropTable
DROP TABLE "BusinessVerification";

-- CreateTable
CREATE TABLE "VerificationRequirement" (
    "id" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "validityDays" INTEGER,
    "reminderDaysBefore" INTEGER[] DEFAULT ARRAY[90, 30, 14, 7]::INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VerificationRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessVerificationDocument" (
    "id" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,
    "requirementId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "adminRemarks" TEXT,
    "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
    "isSuperseded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BusinessVerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationReviewHistory" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "remarks" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationReviewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationRequirement_isActive_idx" ON "VerificationRequirement"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRequirement_documentType_isActive_key" ON "VerificationRequirement"("documentType", "isActive");

-- CreateIndex
CREATE INDEX "BusinessVerificationDocument_orgId_status_idx" ON "BusinessVerificationDocument"("orgId", "status");

-- CreateIndex
CREATE INDEX "BusinessVerificationDocument_orgId_documentType_idx" ON "BusinessVerificationDocument"("orgId", "documentType");

-- CreateIndex
CREATE INDEX "BusinessVerificationDocument_expiresAt_idx" ON "BusinessVerificationDocument"("expiresAt");

-- CreateIndex
CREATE INDEX "VerificationReviewHistory_documentId_reviewedAt_idx" ON "VerificationReviewHistory"("documentId", "reviewedAt");

-- AddForeignKey
ALTER TABLE "BusinessVerificationDocument" ADD CONSTRAINT "BusinessVerificationDocument_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVerificationDocument" ADD CONSTRAINT "BusinessVerificationDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "VerificationRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationReviewHistory" ADD CONSTRAINT "VerificationReviewHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "BusinessVerificationDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
