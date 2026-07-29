-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('PROCUREMENET_OFFICER', 'PURCHASING_OFFICER', 'BUYER', 'AUTHORIZED_REPRESENTATIVE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'GOVERNMENT_ID_FRONT';
ALTER TYPE "DocumentType" ADD VALUE 'GOVERNMENT_ID_BACK';
ALTER TYPE "DocumentType" ADD VALUE 'SELFIE_WITH_ID';
ALTER TYPE "DocumentType" ADD VALUE 'TIN';
ALTER TYPE "DocumentType" ADD VALUE 'NBI_CLEARANCE';
ALTER TYPE "DocumentType" ADD VALUE 'POLICE_CLEARANCE';
ALTER TYPE "DocumentType" ADD VALUE 'OTHER_DOCUMENT';

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "agentId" TEXT,
    "orgId" INTEGER NOT NULL,
    "positionId" TEXT,
    "invitedById" INTEGER,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationMembership_agentId_idx" ON "OrganizationMembership"("agentId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_status_idx" ON "OrganizationMembership"("status");

-- CreateIndex
CREATE INDEX "OrganizationMembership_invitedById_idx" ON "OrganizationMembership"("invitedById");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_userId_orgId_key" ON "OrganizationMembership"("userId", "orgId");

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;
