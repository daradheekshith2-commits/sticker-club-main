DO $$ BEGIN
 CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','PAID','FAILED','REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Cart and checkout persistence additions.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingAddress" JSONB;
UPDATE "Order" SET "shippingAddress" = '{}'::jsonb WHERE "shippingAddress" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "shippingAddress" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_cartId_productId_key" ON "CartItem"("cartId","productId");
CREATE INDEX IF NOT EXISTS "CartItem_cartId_idx" ON "CartItem"("cartId");
