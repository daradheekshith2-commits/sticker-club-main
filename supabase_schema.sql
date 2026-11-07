-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FulfilmentMethod" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'COD');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('AWAITING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'COLLECTED');

-- CreateEnum
CREATE TYPE "VerificationState" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MovementReason" AS ENUM ('ORDER', 'CANCELLATION', 'ADMIN_ADJUSTMENT', 'RESTOCK');

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "blurb" TEXT,
    "color" TEXT,
    "motif" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "productType" TEXT NOT NULL DEFAULT 'single',
    "category" TEXT NOT NULL DEFAULT 'stickers',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "packQuantity" INTEGER,
    "dimensions" TEXT,
    "material" TEXT,
    "finish" TEXT,
    "note" TEXT,
    "rarity" TEXT,
    "seriesId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "productId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("productId","id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "reason" "MovementReason" NOT NULL,
    "orderId" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockChange" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "actorId" TEXT,
    "before" INTEGER,
    "after" INTEGER,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
    "fulfilmentMethod" "FulfilmentMethod" NOT NULL DEFAULT 'DELIVERY',
    "shippingAddress" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "idempotencyKey" TEXT,
    "requestKey" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentVerifiedById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "variantId" TEXT,
    "variantLabel" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "metadata" JSONB,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorId" TEXT,
    "kind" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSubmission" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "utr" TEXT,
    "receiptUrl" TEXT,
    "status" "VerificationState" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "note" TEXT,

    CONSTRAINT "PaymentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentState" NOT NULL DEFAULT 'AWAITING',
    "amount" DECIMAL(12,2) NOT NULL,
    "utr" TEXT,
    "receiptUrl" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "collectedAt" TIMESTAMP(3),
    "collectedById" TEXT,
    "rejectionReason" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
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

-- CreateTable
CREATE TABLE "CustomArtwork" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "role" TEXT NOT NULL DEFAULT 'customer-upload',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomArtwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "artworkId" TEXT,
    "config" JSONB NOT NULL,
    "previewUrl" TEXT,
    "productionNotes" TEXT,

    CONSTRAINT "CustomOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomOrderArtwork" (
    "id" TEXT NOT NULL,
    "customOrderId" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "slotId" TEXT,
    "role" TEXT,

    CONSTRAINT "CustomOrderArtwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropProposal" (
    "id" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "pitch" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resultsPublic" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DropProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalDirection" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ProposalDirection_pkey" PRIMARY KEY ("proposalId","id")
);

-- CreateTable
CREATE TABLE "ProposalVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmittedIdea" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT,
    "userId" TEXT NOT NULL,
    "idea" TEXT NOT NULL,
    "name" TEXT,
    "originalConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmittedIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassportRule" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "stampsGoal" INTEGER NOT NULL DEFAULT 8,
    "stampRule" TEXT NOT NULL DEFAULT 'One stamp for each eligible completed, paid order.',
    "rewardDescription" TEXT NOT NULL DEFAULT 'A free mini sticker of your choice',
    "rewardValueCap" DECIMAL(12,2),
    "seriesGoal" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PassportRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerStamp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ORDER',
    "reason" TEXT,
    "seriesIds" JSONB,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerStamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassportRewardRedemption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stampsUsed" INTEGER NOT NULL DEFAULT 8,
    "rewardDescription" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PassportRewardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_orderId_idx" ON "InventoryMovement"("orderId");

-- CreateIndex
CREATE INDEX "StockChange_productId_createdAt_idx" ON "StockChange"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_variantId_key" ON "CartItem"("cartId", "productId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_requestKey_key" ON "Order"("requestKey");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Order_userId_idempotencyKey_key" ON "Order"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSubmission_utr_key" ON "PaymentSubmission"("utr");

-- CreateIndex
CREATE INDEX "PaymentSubmission_orderId_submittedAt_idx" ON "PaymentSubmission"("orderId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_utr_key" ON "Payment"("utr");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomArtwork_fileName_key" ON "CustomArtwork"("fileName");

-- CreateIndex
CREATE INDEX "CustomArtwork_userId_idx" ON "CustomArtwork"("userId");

-- CreateIndex
CREATE INDEX "CustomOrder_artworkId_idx" ON "CustomOrder"("artworkId");

-- CreateIndex
CREATE INDEX "CustomOrderArtwork_customOrderId_idx" ON "CustomOrderArtwork"("customOrderId");

-- CreateIndex
CREATE INDEX "CustomOrderArtwork_artworkId_idx" ON "CustomOrderArtwork"("artworkId");

-- CreateIndex
CREATE INDEX "ProposalVote_proposalId_idx" ON "ProposalVote"("proposalId");

-- CreateIndex
CREATE INDEX "ProposalVote_userId_idx" ON "ProposalVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalVote_proposalId_userId_key" ON "ProposalVote"("proposalId", "userId");

-- CreateIndex
CREATE INDEX "SubmittedIdea_userId_idx" ON "SubmittedIdea"("userId");

-- CreateIndex
CREATE INDEX "SubmittedIdea_proposalId_idx" ON "SubmittedIdea"("proposalId");

-- CreateIndex
CREATE INDEX "SubmittedIdea_status_idx" ON "SubmittedIdea"("status");

-- CreateIndex
CREATE INDEX "CustomerStamp_userId_idx" ON "CustomerStamp"("userId");

-- CreateIndex
CREATE INDEX "CustomerStamp_orderId_idx" ON "CustomerStamp"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerStamp_userId_orderId_key" ON "CustomerStamp"("userId", "orderId");

-- CreateIndex
CREATE INDEX "PassportRewardRedemption_userId_idx" ON "PassportRewardRedemption"("userId");

-- CreateIndex
CREATE INDEX "PassportRewardRedemption_status_idx" ON "PassportRewardRedemption"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockChange" ADD CONSTRAINT "StockChange_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomArtwork" ADD CONSTRAINT "CustomArtwork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomOrder" ADD CONSTRAINT "CustomOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomOrder" ADD CONSTRAINT "CustomOrder_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "CustomArtwork"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomOrderArtwork" ADD CONSTRAINT "CustomOrderArtwork_customOrderId_fkey" FOREIGN KEY ("customOrderId") REFERENCES "CustomOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomOrderArtwork" ADD CONSTRAINT "CustomOrderArtwork_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "CustomArtwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalDirection" ADD CONSTRAINT "ProposalDirection_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "DropProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVote" ADD CONSTRAINT "ProposalVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "DropProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVote" ADD CONSTRAINT "ProposalVote_proposalId_directionId_fkey" FOREIGN KEY ("proposalId", "directionId") REFERENCES "ProposalDirection"("proposalId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVote" ADD CONSTRAINT "ProposalVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittedIdea" ADD CONSTRAINT "SubmittedIdea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittedIdea" ADD CONSTRAINT "SubmittedIdea_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "DropProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerStamp" ADD CONSTRAINT "CustomerStamp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerStamp" ADD CONSTRAINT "CustomerStamp_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassportRewardRedemption" ADD CONSTRAINT "PassportRewardRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) & SECURITY TRIGGERS (Migration 20261106010000)
-- =====================================================================

-- 1. Support auth.uid() function in both Supabase and standard PostgreSQL
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')
  )::text;
$$;

-- 2. Define authoritative admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_role text;
BEGIN
  BEGIN
    v_uid := auth.uid()::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  IF v_uid IS NULL OR v_uid = '' THEN
    RETURN false;
  END IF;
  SELECT role::text INTO v_role FROM public."User" WHERE id = v_uid;
  RETURN v_role = 'ADMIN';
END;
$$;

-- 3. Trigger to protect User.role from customer privilege escalation
CREATE OR REPLACE FUNCTION public.trg_protect_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: only administrators can alter user roles.';
      END IF;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      NEW.role := 'CUSTOMER'::public."Role";
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_role ON public."User";
CREATE TRIGGER trg_protect_user_role
BEFORE INSERT OR UPDATE OF role ON public."User"
FOR EACH ROW
EXECUTE FUNCTION public.trg_protect_user_role();

-- 4. Trigger to protect Payment.status from unauthorized customer verification
CREATE OR REPLACE FUNCTION public.trg_protect_payment_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (NEW.status = 'VERIFIED'::public."PaymentState" AND OLD.status != 'VERIFIED'::public."PaymentState")
     OR (NEW.status = 'COLLECTED'::public."PaymentState" AND OLD.status != 'COLLECTED'::public."PaymentState") THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: customers cannot verify or collect payments.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_payment_updates ON public."Payment";
CREATE TRIGGER protect_payment_updates
BEFORE UPDATE OF status ON public."Payment"
FOR EACH ROW
EXECUTE FUNCTION public.trg_protect_payment_state();

-- 5. Inventory check constraint to prevent negative quantities
ALTER TABLE public."Inventory" DROP CONSTRAINT IF EXISTS "Inventory_quantity_check";
ALTER TABLE public."Inventory" ADD CONSTRAINT "Inventory_quantity_check" CHECK ("quantity" >= 0);

-- 6. Trigger to deduct inventory on OrderItem creation and block overselling
CREATE OR REPLACE FUNCTION public.trg_deduct_inventory_on_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available integer;
BEGIN
  IF NEW."productId" IS NOT NULL THEN
    SELECT "quantity" INTO v_available FROM public."Inventory" WHERE "productId" = NEW."productId" FOR UPDATE;
    IF v_available IS NOT NULL THEN
      IF v_available < NEW."quantity" THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: product % has % units but % requested', NEW."productId", v_available, NEW."quantity";
      END IF;
      UPDATE public."Inventory"
      SET "quantity" = "quantity" - NEW."quantity"
      WHERE "productId" = NEW."productId";
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deduct_inventory_on_order_item ON public."OrderItem";
CREATE TRIGGER deduct_inventory_on_order_item
BEFORE INSERT ON public."OrderItem"
FOR EACH ROW
EXECUTE FUNCTION public.trg_deduct_inventory_on_order_item();

-- 7. Supabase Auth sync trigger if auth.users exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, "passwordHash", role, "createdAt", "updatedAt")
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Storefront Customer'),
    'SUPABASE_MANAGED_AUTH',
    'CUSTOMER'::public."Role",
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      "updatedAt" = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 8. Enable Row Level Security on all 31 public tables
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Address" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InventoryMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StockChange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Cart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CartItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CustomArtwork" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CustomOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CustomOrderArtwork" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DropProposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProposalDirection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProposalVote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SubmittedIdea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PassportRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CustomerStamp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PassportRewardRedemption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductActivity" ENABLE ROW LEVEL SECURITY;

-- 9. Row Level Security Policies

-- A. Catalogue Tables (Public read, admin write)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Category', 'Product', 'ProductVariant', 'ProductCategory', 'ProductImage', 'PassportRule', 'DropProposal', 'ProposalDirection']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_public_read" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_public_read" ON public.%I FOR SELECT USING (true)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_admin_write" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_admin_write" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t, t);
  END LOOP;
END $$;

-- B. User Table Policies
DROP POLICY IF EXISTS "User_select_own_or_admin" ON public."User";
CREATE POLICY "User_select_own_or_admin" ON public."User" FOR SELECT USING (auth.uid()::text = id OR public.is_admin());

DROP POLICY IF EXISTS "User_update_own_or_admin" ON public."User";
CREATE POLICY "User_update_own_or_admin" ON public."User" FOR UPDATE USING (auth.uid()::text = id OR public.is_admin()) WITH CHECK (auth.uid()::text = id OR public.is_admin());

DROP POLICY IF EXISTS "User_insert_public" ON public."User";
CREATE POLICY "User_insert_public" ON public."User" FOR INSERT WITH CHECK (true);

-- C. Customer Private Tables
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Address', 'Cart', 'CustomerStamp', 'SubmittedIdea', 'ProposalVote', 'CustomArtwork', 'PassportRewardRedemption']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_own" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_select_own" ON public.%I FOR SELECT USING (auth.uid()::text = "userId" OR public.is_admin())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_own" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_insert_own" ON public.%I FOR INSERT WITH CHECK (auth.uid()::text = "userId" OR public.is_admin())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_update_own" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_update_own" ON public.%I FOR UPDATE USING (auth.uid()::text = "userId" OR public.is_admin()) WITH CHECK (auth.uid()::text = "userId" OR public.is_admin())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_delete_own" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_delete_own" ON public.%I FOR DELETE USING (auth.uid()::text = "userId" OR public.is_admin())', t, t);
  END LOOP;
END $$;

-- D. CartItem (via Cart)
DROP POLICY IF EXISTS "CartItem_own_cart" ON public."CartItem";
CREATE POLICY "CartItem_own_cart" ON public."CartItem" FOR ALL
USING (EXISTS (SELECT 1 FROM public."Cart" c WHERE c.id = "cartId" AND (c."userId" = auth.uid()::text OR public.is_admin())))
WITH CHECK (EXISTS (SELECT 1 FROM public."Cart" c WHERE c.id = "cartId" AND (c."userId" = auth.uid()::text OR public.is_admin())));

-- E. Order & Order Children
DROP POLICY IF EXISTS "Order_select_own" ON public."Order";
CREATE POLICY "Order_select_own" ON public."Order" FOR SELECT USING (auth.uid()::text = "userId" OR public.is_admin());

DROP POLICY IF EXISTS "Order_insert_own" ON public."Order";
CREATE POLICY "Order_insert_own" ON public."Order" FOR INSERT WITH CHECK (auth.uid()::text = "userId" OR public.is_admin());

DROP POLICY IF EXISTS "Order_update_own" ON public."Order";
CREATE POLICY "Order_update_own" ON public."Order" FOR UPDATE USING (auth.uid()::text = "userId" OR public.is_admin()) WITH CHECK (auth.uid()::text = "userId" OR public.is_admin());

DROP POLICY IF EXISTS "Order_delete_admin" ON public."Order";
CREATE POLICY "Order_delete_admin" ON public."Order" FOR DELETE USING (public.is_admin());

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['OrderItem', 'OrderEvent', 'CustomOrder', 'PaymentSubmission']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_order_access" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_order_access" ON public.%I FOR ALL USING (EXISTS (SELECT 1 FROM public."Order" o WHERE o.id = "orderId" AND (o."userId" = auth.uid()::text OR public.is_admin()))) WITH CHECK (EXISTS (SELECT 1 FROM public."Order" o WHERE o.id = "orderId" AND (o."userId" = auth.uid()::text OR public.is_admin())))', t, t);
  END LOOP;
END $$;

-- Policy for CustomOrderArtwork which joins through CustomOrder (customOrderId -> CustomOrder.id -> CustomOrder.orderId)
DROP POLICY IF EXISTS "CustomOrderArtwork_order_access" ON public."CustomOrderArtwork";
CREATE POLICY "CustomOrderArtwork_order_access" ON public."CustomOrderArtwork" FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public."CustomOrder" co
    JOIN public."Order" o ON o.id = co."orderId"
    WHERE co.id = "customOrderId" AND (o."userId" = auth.uid()::text OR public.is_admin())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public."CustomOrder" co
    JOIN public."Order" o ON o.id = co."orderId"
    WHERE co.id = "customOrderId" AND (o."userId" = auth.uid()::text OR public.is_admin())
  )
);

-- F. Payment
DROP POLICY IF EXISTS "Payment_order_access" ON public."Payment";
CREATE POLICY "Payment_order_access" ON public."Payment" FOR ALL
USING (EXISTS (SELECT 1 FROM public."Order" o WHERE o.id = "orderId" AND (o."userId" = auth.uid()::text OR public.is_admin())))
WITH CHECK (EXISTS (SELECT 1 FROM public."Order" o WHERE o.id = "orderId" AND (o."userId" = auth.uid()::text OR public.is_admin())));

-- G. Internal Tables (Admin only)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Inventory', 'InventoryMovement', 'StockChange', 'AuditLog', 'RefreshToken', 'PasswordResetToken']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_admin_only" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_admin_only" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t, t);
  END LOOP;
END $$;

-- H. ProductActivity
DROP POLICY IF EXISTS "ProductActivity_public_select" ON public."ProductActivity";
CREATE POLICY "ProductActivity_public_select" ON public."ProductActivity" FOR SELECT USING (true);

DROP POLICY IF EXISTS "ProductActivity_public_insert" ON public."ProductActivity";
CREATE POLICY "ProductActivity_public_insert" ON public."ProductActivity" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "ProductActivity_admin_all" ON public."ProductActivity";
CREATE POLICY "ProductActivity_admin_all" ON public."ProductActivity" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


