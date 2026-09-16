CREATE TYPE "NotificationRecipientAudience" AS ENUM ('ACCOUNT', 'PLATFORM_ADMIN');

ALTER TABLE "Notification"
  ADD COLUMN "recipientAudience" "NotificationRecipientAudience" NOT NULL DEFAULT 'ACCOUNT',
  ADD COLUMN "referenceType" TEXT,
  ADD COLUMN "referenceId" TEXT;

CREATE INDEX "Notification_orgId_isRead_createdAt_idx"
  ON "Notification"("orgId", "isRead", "createdAt");

CREATE INDEX "Notification_recipientAudience_isRead_createdAt_idx"
  ON "Notification"("recipientAudience", "isRead", "createdAt");
