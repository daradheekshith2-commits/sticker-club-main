-- Initial schema for a clean local PostgreSQL database.
-- Applied BEFORE 20261030120000_cart_checkout, which adds payment state,
-- shipping snapshots and cart-item uniqueness.
CREATE TYPE "Role" AS ENUM ('CUSTOMER','ADMIN');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING','CONFIRMED','PROCESSING','SHIPPED','COMPLETED','CANCELLED');

CREATE TABLE "User" (
 "id" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "email" TEXT NOT NULL,
 "passwordHash" TEXT NOT NULL,
 "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
 "phone" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Address" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "recipient" TEXT NOT NULL,
 "line1" TEXT NOT NULL,
 "line2" TEXT,
 "city" TEXT NOT NULL,
 "state" TEXT NOT NULL,
 "postalCode" TEXT NOT NULL,
 "isDefault" BOOLEAN NOT NULL DEFAULT false,
 CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Category" (
 "id" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Product" (
 "id" TEXT NOT NULL,
 "slug" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "description" TEXT NOT NULL,
 "price" DECIMAL(12,2) NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProductCategory" (
 "productId" TEXT NOT NULL,
 "categoryId" TEXT NOT NULL,
 CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId","categoryId")
);
CREATE TABLE "ProductImage" (
 "id" TEXT NOT NULL,
 "productId" TEXT NOT NULL,
 "url" TEXT NOT NULL,
 "alt" TEXT NOT NULL,
 "position" INTEGER NOT NULL DEFAULT 0,
 CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Inventory" (
 "productId" TEXT NOT NULL,
 "quantity" INTEGER NOT NULL DEFAULT 0,
 CONSTRAINT "Inventory_pkey" PRIMARY KEY ("productId")
);
CREATE TABLE "Cart" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CartItem" (
 "id" TEXT NOT NULL,
 "cartId" TEXT NOT NULL,
 "productId" TEXT NOT NULL,
 "quantity" INTEGER NOT NULL,
 CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Order" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
 "total" DECIMAL(12,2) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OrderItem" (
 "id" TEXT NOT NULL,
 "orderId" TEXT NOT NULL,
 "productId" TEXT,
 "nameSnapshot" TEXT NOT NULL,
 "unitPrice" DECIMAL(12,2) NOT NULL,
 "quantity" INTEGER NOT NULL,
 CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CustomOrder" (
 "id" TEXT NOT NULL,
 "orderId" TEXT NOT NULL,
 "config" JSONB NOT NULL,
 "previewUrl" TEXT,
 CONSTRAINT "CustomOrder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RefreshToken" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "revokedAt" TIMESTAMP(3),
 CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PasswordResetToken" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "usedAt" TIMESTAMP(3),
 CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "Address_userId_idx" ON "Address"("userId");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId","createdAt");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomOrder" ADD CONSTRAINT "CustomOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
