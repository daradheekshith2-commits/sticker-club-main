-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('AWAITING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'COLLECTED');

-- CreateTable Payment
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentState" NOT NULL DEFAULT 'AWAITING',
    "amount" DECIMAL(12,2) NOT NULL,
    "utr" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "collectedAt" TIMESTAMP(3),
    "collectedById" TEXT,
    "rejectionReason" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_orderId_key" ON "Payment"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_utr_key" ON "Payment"("utr");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");
CREATE INDEX IF NOT EXISTS "Payment_orderId_idx" ON "Payment"("orderId");

CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Payment_orderId_fkey'
    ) THEN
        ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Safe Backfill: existing orders with subtotal=0 but total>0
UPDATE "Order" SET "subtotal" = "total" WHERE "subtotal" = 0 AND "total" > 0;

-- Backfill Payment record for any existing orders lacking one
INSERT INTO "Payment" ("id", "orderId", "method", "status", "amount", "createdAt", "updatedAt")
SELECT 
    'pay_' || o.id,
    o.id,
    o."paymentMethod",
    CASE 
        WHEN o."paymentStatus" = 'PAID' THEN 'VERIFIED'::"PaymentState"
        ELSE 'AWAITING'::"PaymentState"
    END,
    o.total,
    o."createdAt",
    CURRENT_TIMESTAMP
FROM "Order" o
WHERE NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id);
