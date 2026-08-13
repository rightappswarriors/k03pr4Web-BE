-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RESPONDED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('RFQ', 'ORDER');

-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('AGENT', 'SUPPLIER');

-- CreateTable
CREATE TABLE "RequestForQuotation" (
    "id" TEXT NOT NULL,
    "rfqNumber" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "supplierOrgId" INTEGER,
    "supplierOrgName" TEXT,
    "supplierItemId" TEXT,
    "status" "RfqStatus" NOT NULL DEFAULT 'DRAFT',
    "conversationId" TEXT,
    "targetUnitPrice" DOUBLE PRECISION,
    "quantity" TEXT,
    "expectedDeliveryDate" TIMESTAMP(3),
    "validityDays" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RequestForQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT,
    "type" "ConversationType" NOT NULL DEFAULT 'RFQ',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "agentId" TEXT,
    "organizationId" INTEGER,
    "role" "ConversationRole" NOT NULL DEFAULT 'AGENT',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderAgentId" TEXT,
    "senderOrgId" INTEGER,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequestForQuotation_rfqNumber_key" ON "RequestForQuotation"("rfqNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RequestForQuotation_conversationId_key" ON "RequestForQuotation"("conversationId");

-- CreateIndex
CREATE INDEX "RequestForQuotation_agentId_status_idx" ON "RequestForQuotation"("agentId", "status");

-- CreateIndex
CREATE INDEX "RequestForQuotation_supplierOrgId_status_idx" ON "RequestForQuotation"("supplierOrgId", "status");

-- CreateIndex
CREATE INDEX "RequestForQuotation_supplierItemId_idx" ON "RequestForQuotation"("supplierItemId");

-- CreateIndex
CREATE INDEX "RequestForQuotation_status_idx" ON "RequestForQuotation"("status");

-- CreateIndex
CREATE INDEX "RequestForQuotation_createdAt_idx" ON "RequestForQuotation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_rfqId_key" ON "Conversation"("rfqId");

-- CreateIndex
CREATE INDEX "Conversation_rfqId_idx" ON "Conversation"("rfqId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "ConversationParticipant"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_agentId_idx" ON "ConversationParticipant"("agentId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_organizationId_idx" ON "ConversationParticipant"("organizationId");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationMessage_senderAgentId_idx" ON "ConversationMessage"("senderAgentId");

-- CreateIndex
CREATE INDEX "ConversationMessage_senderOrgId_idx" ON "ConversationMessage"("senderOrgId");

-- AddForeignKey
ALTER TABLE "RequestForQuotation" ADD CONSTRAINT "RequestForQuotation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForQuotation" ADD CONSTRAINT "RequestForQuotation_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForQuotation" ADD CONSTRAINT "RequestForQuotation_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestForQuotation" ADD CONSTRAINT "RequestForQuotation_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_senderAgentId_fkey" FOREIGN KEY ("senderAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_senderOrgId_fkey" FOREIGN KEY ("senderOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
