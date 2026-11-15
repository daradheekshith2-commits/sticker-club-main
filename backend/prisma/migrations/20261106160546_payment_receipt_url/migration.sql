-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;

-- AlterTable
ALTER TABLE "PaymentSubmission" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;
ALTER TABLE "PaymentSubmission" ALTER COLUMN "utr" DROP NOT NULL;
