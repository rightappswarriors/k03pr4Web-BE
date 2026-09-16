ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "LedgerSourceType" ADD VALUE IF NOT EXISTS 'ESCROW_REVERSAL';

CREATE TYPE "PurchaseOrderCancellationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');
CREATE TYPE "PaymentRefundStatus" AS ENUM ('REQUIRES_MANUAL_REFUND', 'PROCESSING', 'REFUNDED', 'FAILED', 'RECONCILIATION_REQUIRED');

CREATE TABLE "PurchaseOrderCancellation" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "PurchaseOrderCancellationStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedByOrgId" INTEGER,
    "requestedByUserId" INTEGER,
    "approvedByOrgId" INTEGER,
    "approvedByUserId" INTEGER,
    "rejectedByOrgId" INTEGER,
    "rejectedByUserId" INTEGER,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PurchaseOrderCancellation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PurchaseOrderCancellation_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PurchaseOrderCancellation_purchaseOrderId_key" ON "PurchaseOrderCancellation"("purchaseOrderId");
CREATE INDEX "PurchaseOrderCancellation_status_requestedAt_idx" ON "PurchaseOrderCancellation"("status", "requestedAt");

CREATE TABLE "PaymentRefund" (
    "id" TEXT NOT NULL,
    "paymentTransactionId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "reason" TEXT NOT NULL,
    "status" "PaymentRefundStatus" NOT NULL DEFAULT 'REQUIRES_MANUAL_REFUND',
    "providerRefundId" TEXT,
    "requestedById" INTEGER,
    "approvedById" INTEGER,
    "environment" "Environment" NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerSubmittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentRefund_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentRefund_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaymentRefund_paymentTransactionId_key" ON "PaymentRefund"("paymentTransactionId");
CREATE UNIQUE INDEX "PaymentRefund_purchaseOrderId_key" ON "PaymentRefund"("purchaseOrderId");
CREATE UNIQUE INDEX "PaymentRefund_providerRefundId_key" ON "PaymentRefund"("providerRefundId");
CREATE INDEX "PaymentRefund_environment_status_requestedAt_idx" ON "PaymentRefund"("environment", "status", "requestedAt");
