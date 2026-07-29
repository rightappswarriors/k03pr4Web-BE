-- CreateEnum
CREATE TYPE "ProcurementInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ProcurementAgentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ProcurementInvitation" (
    "id" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,
    "email" TEXT,
    "code" TEXT,
    "link" TEXT,
    "positionId" TEXT,
    "status" "ProcurementInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ProcurementInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementAgentRequest" (
    "id" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,
    "agentId" TEXT NOT NULL,
    "message" TEXT,
    "status" "ProcurementAgentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProcurementAgentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementInvitation_code_key" ON "ProcurementInvitation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementInvitation_link_key" ON "ProcurementInvitation"("link");

-- CreateIndex
CREATE INDEX "ProcurementInvitation_orgId_status_idx" ON "ProcurementInvitation"("orgId", "status");

-- CreateIndex
CREATE INDEX "ProcurementInvitation_email_idx" ON "ProcurementInvitation"("email");

-- CreateIndex
CREATE INDEX "ProcurementInvitation_code_idx" ON "ProcurementInvitation"("code");

-- CreateIndex
CREATE INDEX "ProcurementAgentRequest_orgId_status_idx" ON "ProcurementAgentRequest"("orgId", "status");

-- CreateIndex
CREATE INDEX "ProcurementAgentRequest_agentId_status_idx" ON "ProcurementAgentRequest"("agentId", "status");

-- AddForeignKey
ALTER TABLE "ProcurementInvitation" ADD CONSTRAINT "ProcurementInvitation_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementInvitation" ADD CONSTRAINT "ProcurementInvitation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementAgentRequest" ADD CONSTRAINT "ProcurementAgentRequest_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementAgentRequest" ADD CONSTRAINT "ProcurementAgentRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
