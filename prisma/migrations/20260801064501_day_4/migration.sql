/*
  Warnings:

  - The values [RESPONDED,ACCEPTED,REJECTED,NEGOTIATION_ACCEPTED,NEGOTIATION_REJECTED] on the enum `RfqStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "RfqOfferType" AS ENUM ('INITIAL_REQUEST', 'COUNTER_OFFER', 'FINAL_OFFER', 'ACCEPTANCE', 'REJECTION');

-- CreateEnum
CREATE TYPE "RfqOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'RFQ_CREATED', 'COUNTER_OFFER', 'FINAL_OFFER', 'PRICE_ACCEPTED', 'PRICE_REJECTED', 'SYSTEM');

-- AlterEnum
BEGIN;
CREATE TYPE "RfqStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEGOTIATING', 'SUPPLIER_OFFERED', 'BUYER_COUNTERED', 'NEGOTIATION_COMPLETED', 'PO_CREATED', 'CANCELLED', 'EXPIRED');
ALTER TABLE "public"."RequestForQuotation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "RequestForQuotation" ALTER COLUMN "status" TYPE "RfqStatus_new" USING ("status"::text::"RfqStatus_new");
ALTER TYPE "RfqStatus" RENAME TO "RfqStatus_old";
ALTER TYPE "RfqStatus_new" RENAME TO "RfqStatus";
DROP TYPE "public"."RfqStatus_old";
ALTER TABLE "RequestForQuotation" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "ConversationMessage" ADD COLUMN     "rfqOfferId" TEXT,
ADD COLUMN     "type" "MessageType" NOT NULL DEFAULT 'TEXT';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "RfqOffer" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "senderAgentId" TEXT,
    "senderSupplierId" INTEGER,
    "offerType" "RfqOfferType" NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "estimatedLeadDays" INTEGER,
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "status" "RfqOfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RfqOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RfqOffer_rfqId_status_idx" ON "RfqOffer"("rfqId", "status");

-- CreateIndex
CREATE INDEX "RfqOffer_rfqId_createdAt_idx" ON "RfqOffer"("rfqId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationMessage_rfqOfferId_idx" ON "ConversationMessage"("rfqOfferId");

-- AddForeignKey
ALTER TABLE "RfqOffer" ADD CONSTRAINT "RfqOffer_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RequestForQuotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqOffer" ADD CONSTRAINT "RfqOffer_senderAgentId_fkey" FOREIGN KEY ("senderAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqOffer" ADD CONSTRAINT "RfqOffer_senderSupplierId_fkey" FOREIGN KEY ("senderSupplierId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
