-- Add missing NotificationType enum values that were added to the schema
-- but never migrated to the database.
--
-- The initial migration (20260703071102) only created three values:
--   OUTLET_LOW_STOCK, ORG_CRITICAL_STOCK, NEW_TRANSACTION
--
-- The schema.prisma already declares these additional values; this migration
-- brings the database enum in sync. PostgreSQL 12+ allows ALTER TYPE … ADD
-- VALUE inside a transaction block, so this is safe under Prisma Migrate.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RFQ_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COUNTER_OFFER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEGOTIATION_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEGOTIATION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_CREATED';
