-- CreateEnum
CREATE TYPE "NegotiationOfferStatus" AS ENUM ('PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RfqStatus" ADD VALUE 'NEGOTIATION_ACCEPTED';
ALTER TYPE "RfqStatus" ADD VALUE 'NEGOTIATION_REJECTED';

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "lastReadAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RequestForQuotation" ADD COLUMN     "acceptedDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "acceptedPrice" DOUBLE PRECISION,
ADD COLUMN     "acceptedQuantity" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "NegotiationOffer" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" "ConversationRole" NOT NULL,
    "senderAgentId" TEXT,
    "senderOrgId" INTEGER,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "status" "NegotiationOfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NegotiationOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NegotiationOffer_conversationId_status_idx" ON "NegotiationOffer"("conversationId", "status");

-- CreateIndex
CREATE INDEX "NegotiationOffer_conversationId_createdAt_idx" ON "NegotiationOffer"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "NegotiationOffer" ADD CONSTRAINT "NegotiationOffer_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiationOffer" ADD CONSTRAINT "NegotiationOffer_senderAgentId_fkey" FOREIGN KEY ("senderAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegotiationOffer" ADD CONSTRAINT "NegotiationOffer_senderOrgId_fkey" FOREIGN KEY ("senderOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
