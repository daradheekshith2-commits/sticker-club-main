-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;

-- AlterTable
ALTER TABLE "PaymentSubmission" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;
ALTER TABLE "PaymentSubmission" ALTER COLUMN "utr" DROP NOT NULL;

-- Remove duplicate inventory decrement trigger to allow atomic application decrement
DROP TRIGGER IF EXISTS deduct_inventory_on_order_item ON public."OrderItem";

