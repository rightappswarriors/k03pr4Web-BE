-- AlterEnum: Add REJECTED to ProcurementInvitationStatus
ALTER TYPE "ProcurementInvitationStatus" ADD VALUE 'REJECTED';

-- Add new columns to ProcurementInvitation
ALTER TABLE "ProcurementInvitation"
  ADD COLUMN "usedByAgentId" TEXT,
  ADD COLUMN "usedAt" TIMESTAMP(3),
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedBy" INTEGER,
  ADD COLUMN "rejectedBy" INTEGER,
  ADD COLUMN "rejectionReason" TEXT;

-- Add foreign key constraint for usedByAgentId -> Agent(id)
ALTER TABLE "ProcurementInvitation"
  ADD CONSTRAINT "ProcurementInvitation_usedByAgentId_fkey"
  FOREIGN KEY ("usedByAgentId") REFERENCES "Agent"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "ProcurementInvitation_usedByAgentId_idx" ON "ProcurementInvitation"("usedByAgentId");
CREATE UNIQUE INDEX "ProcurementInvitation_usedByAgentId_unique" ON "ProcurementInvitation"("usedByAgentId");