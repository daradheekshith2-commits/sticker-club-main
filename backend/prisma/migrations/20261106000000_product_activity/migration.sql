-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductActivity" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sessionId" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductActivity_productId_createdAt_idx" ON "ProductActivity"("productId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductActivity_type_createdAt_idx" ON "ProductActivity"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProductActivity_productId_type_sessionId_key" ON "ProductActivity"("productId", "type", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProductActivity_productId_orderId_key" ON "ProductActivity"("productId", "orderId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductActivity_productId_fkey'
  ) THEN
    ALTER TABLE "ProductActivity" ADD CONSTRAINT "ProductActivity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
