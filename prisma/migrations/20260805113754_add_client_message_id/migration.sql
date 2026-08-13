-- AlterTable
ALTER TABLE "ConversationMessage" ADD COLUMN     "clientMessageId" TEXT;

-- CreateIndex
CREATE INDEX "ConversationMessage_clientMessageId_idx" ON "ConversationMessage"("clientMessageId");
