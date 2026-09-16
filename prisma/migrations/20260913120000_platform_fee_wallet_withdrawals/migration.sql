-- Separate sandbox and production treasury balances without creating new credits.
ALTER TYPE "PlatformLedgerSourceType" ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_PLATFORM_FEE';
ALTER TYPE "PlatformLedgerSourceType" ADD VALUE IF NOT EXISTS 'PLATFORM_WITHDRAWAL';

ALTER TABLE "PlatformWallet" ADD COLUMN "environment" "Environment";

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "PlatformWallet" wallet
    WHERE ABS(wallet.balance - COALESCE((SELECT SUM(entry.amount) FROM "PlatformWalletLedgerEntry" entry WHERE entry."walletId" = wallet.id), 0)) > 0.009
       OR ABS(wallet."heldBalance") > 0.009
  ) THEN
    RAISE EXCEPTION 'Platform wallet requires reconciliation before environment split';
  END IF;
END $$;

UPDATE "PlatformWallet" wallet
SET "environment" = CASE
  WHEN EXISTS (
    SELECT 1 FROM "PlatformWalletLedgerEntry" entry
    WHERE entry."walletId" = wallet.id AND entry.environment = 'PRODUCTION'
  ) THEN 'PRODUCTION'::"Environment"
  WHEN EXISTS (
    SELECT 1 FROM "PlatformWalletLedgerEntry" entry
    WHERE entry."walletId" = wallet.id AND entry.environment = 'SANDBOX'
  ) THEN 'SANDBOX'::"Environment"
  ELSE 'PRODUCTION'::"Environment"
END;

INSERT INTO "PlatformWallet" (currency, balance, "heldBalance", "createdAt", "updatedAt", environment)
SELECT wallet.currency, 0, 0, NOW(), NOW(), entry.environment
FROM "PlatformWallet" wallet
JOIN (
  SELECT DISTINCT "walletId", environment
  FROM "PlatformWalletLedgerEntry"
) entry ON entry."walletId" = wallet.id
WHERE entry.environment <> wallet.environment
  AND NOT EXISTS (
    SELECT 1 FROM "PlatformWallet" existing
    WHERE existing.currency = wallet.currency AND existing.environment = entry.environment
  );

UPDATE "PlatformWalletLedgerEntry" entry
SET "walletId" = target.id
FROM "PlatformWallet" source, "PlatformWallet" target
WHERE entry."walletId" = source.id
  AND target.currency = source.currency
  AND target.environment = entry.environment
  AND source.environment <> entry.environment;

UPDATE "PlatformWallet" wallet
SET balance = COALESCE((
  SELECT SUM(entry.amount)
  FROM "PlatformWalletLedgerEntry" entry
  WHERE entry."walletId" = wallet.id
), 0),
"heldBalance" = 0;

ALTER TABLE "PlatformWallet" ALTER COLUMN "environment" SET NOT NULL;
ALTER TABLE "PlatformWallet" ALTER COLUMN "environment" SET DEFAULT 'PRODUCTION';
DROP INDEX IF EXISTS "PlatformWallet_currency_key";
CREATE UNIQUE INDEX "PlatformWallet_currency_environment_key" ON "PlatformWallet"(currency, environment);

CREATE TABLE "PlatformPayoutMethod" (
  id TEXT PRIMARY KEY,
  environment "Environment" NOT NULL,
  type "PayoutMethodType" NOT NULL,
  "accountName" TEXT NOT NULL,
  "maskedAccountNumber" TEXT NOT NULL,
  "bankName" TEXT,
  "encryptedDestination" TEXT NOT NULL,
  "encryptionKeyVersion" TEXT NOT NULL DEFAULT 'v1',
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "verifiedAt" TIMESTAMP(3),
  "createdById" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3)
);

CREATE TABLE "PlatformWithdrawal" (
  id TEXT PRIMARY KEY,
  "walletId" INTEGER NOT NULL REFERENCES "PlatformWallet"(id),
  "payoutMethodId" TEXT NOT NULL REFERENCES "PlatformPayoutMethod"(id),
  amount DOUBLE PRECISION NOT NULL,
  status "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
  environment "Environment" NOT NULL,
  "requestedById" INTEGER NOT NULL,
  "approvedById" INTEGER,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "sandboxReference" TEXT,
  "payoutDestinationEncrypted" TEXT NOT NULL,
  "payoutDestinationMasked" TEXT NOT NULL,
  "payoutDestinationAccount" TEXT NOT NULL,
  "payoutDestinationBank" TEXT,
  "payoutMethodTypeSnapshot" "PayoutMethodType" NOT NULL,
  "deletedAt" TIMESTAMP(3)
);

DO $$ BEGIN
  CREATE TYPE "WithdrawalPayoutAttemptStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'RECONCILIATION_REQUIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "PlatformWithdrawalPayoutAttempt" (
  id TEXT PRIMARY KEY,
  "withdrawalId" TEXT NOT NULL REFERENCES "PlatformWithdrawal"(id),
  provider TEXT NOT NULL,
  environment "Environment" NOT NULL,
  "providerReference" TEXT,
  amount DOUBLE PRECISION NOT NULL,
  status "WithdrawalPayoutAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "failureCode" TEXT,
  "failureReason" TEXT,
  "operationalNote" TEXT,
  "providerMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3)
);

CREATE UNIQUE INDEX "PlatformWithdrawal_sandboxReference_key" ON "PlatformWithdrawal"("sandboxReference");
CREATE UNIQUE INDEX "PlatformWithdrawalPayoutAttempt_providerReference_key" ON "PlatformWithdrawalPayoutAttempt"("providerReference");
CREATE INDEX "PlatformPayoutMethod_environment_isActive_idx" ON "PlatformPayoutMethod"(environment, "isActive");
CREATE INDEX "PlatformWithdrawal_walletId_status_idx" ON "PlatformWithdrawal"("walletId", status);
CREATE INDEX "PlatformWithdrawal_environment_requestedAt_idx" ON "PlatformWithdrawal"(environment, "requestedAt");
CREATE INDEX "PlatformWithdrawalPayoutAttempt_withdrawalId_status_idx" ON "PlatformWithdrawalPayoutAttempt"("withdrawalId", status);
CREATE INDEX "PlatformWithdrawalPayoutAttempt_provider_environment_status_idx" ON "PlatformWithdrawalPayoutAttempt"(provider, environment, status);
