-- Adds server-priced catalogue variants without changing existing product IDs.
CREATE TABLE "ProductVariant" (
  "productId" TEXT NOT NULL,
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("productId","id")
);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing cart rows become base-product selections (empty string variant).
ALTER TABLE "CartItem" ADD COLUMN "variantId" TEXT NOT NULL DEFAULT '';
DROP INDEX IF EXISTS "CartItem_cartId_productId_key";
CREATE UNIQUE INDEX "CartItem_cartId_productId_variantId_key"
  ON "CartItem"("cartId","productId","variantId");
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantLabel" TEXT;
