-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RfqStatus" ADD VALUE IF NOT EXISTS 'RFQ_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COUNTER_OFFER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEGOTIATION_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEGOTIATION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_CREATED';

-- AlterTable
ALTER TABLE "RfqOffer" ADD COLUMN     "deliveryDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RevokedRefreshToken" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevokedRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RevokedRefreshToken_tokenId_key" ON "RevokedRefreshToken"("tokenId");

-- CreateIndex
CREATE INDEX "RevokedRefreshToken_agentId_idx" ON "RevokedRefreshToken"("agentId");

-- CreateIndex
CREATE INDEX "RevokedRefreshToken_expiresAt_idx" ON "RevokedRefreshToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "RevokedRefreshToken" ADD CONSTRAINT "RevokedRefreshToken_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
