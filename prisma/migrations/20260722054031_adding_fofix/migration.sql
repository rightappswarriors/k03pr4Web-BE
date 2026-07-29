-- AlterTable
ALTER TABLE "ProcurementInvitation" ADD COLUMN     "acceptedByUserId" INTEGER;

-- CreateIndex
CREATE INDEX "ProcurementInvitation_expiresAt_idx" ON "ProcurementInvitation"("expiresAt");

-- AddForeignKey
ALTER TABLE "ProcurementInvitation" ADD CONSTRAINT "ProcurementInvitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
