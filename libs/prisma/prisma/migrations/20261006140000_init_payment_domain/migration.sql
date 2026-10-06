CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "FailureType" AS ENUM ('BUSINESS', 'TECHNICAL');
CREATE TYPE "TransactionType" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "PaymentEventType" AS ENUM ('CREATED', 'QUEUED', 'PROCESSING_STARTED', 'SUCCEEDED', 'FAILED', 'RETRY_TRIGGERED');

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_balance_non_negative" CHECK ("balance" >= 0)
);

CREATE TABLE "payment_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "status" "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "failureReason" TEXT,
    "failureType" "FailureType",
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "queuedAt" TIMESTAMP(3),
    "processingStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "paymentRequestId" UUID,
    "amount" BIGINT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "balanceAfter" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paymentRequestId" UUID NOT NULL,
    "eventType" "PaymentEventType" NOT NULL,
    "previousStatus" "PaymentRequestStatus",
    "newStatus" "PaymentRequestStatus",
    "attemptNumber" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "payment_requests_idempotencyKey_key" ON "payment_requests"("idempotencyKey");
CREATE UNIQUE INDEX "transactions_paymentRequestId_key" ON "transactions"("paymentRequestId");
CREATE INDEX "payment_requests_userId_idx" ON "payment_requests"("userId");
CREATE INDEX "payment_requests_status_idx" ON "payment_requests"("status");
CREATE INDEX "payment_requests_status_createdAt_idx" ON "payment_requests"("status", "createdAt");
CREATE INDEX "payment_requests_reference_idx" ON "payment_requests"("reference");
CREATE INDEX "payment_requests_createdAt_idx" ON "payment_requests"("createdAt");
CREATE INDEX "transactions_userId_createdAt_idx" ON "transactions"("userId", "createdAt");
CREATE INDEX "transactions_type_createdAt_idx" ON "transactions"("type", "createdAt");
CREATE INDEX "payment_events_paymentRequestId_createdAt_idx" ON "payment_events"("paymentRequestId", "createdAt");

ALTER TABLE "payment_requests"
  ADD CONSTRAINT "payment_requests_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_paymentRequestId_fkey"
  FOREIGN KEY ("paymentRequestId") REFERENCES "payment_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_events"
  ADD CONSTRAINT "payment_events_paymentRequestId_fkey"
  FOREIGN KEY ("paymentRequestId") REFERENCES "payment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
