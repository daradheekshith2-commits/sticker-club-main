-- AlterTable: Payment (drop default on updatedAt)
ALTER TABLE "Payment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable: Category
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "blurb" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "motif" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "productType" TEXT NOT NULL DEFAULT 'single';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'stickers';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isNew" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "packQuantity" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "dimensions" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "material" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "finish" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "rarity" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "seriesId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- AlterTable: ProductImage
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: OrderItem
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- AlterTable: CustomArtwork
ALTER TABLE "CustomArtwork" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
ALTER TABLE "CustomArtwork" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "CustomArtwork" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "CustomArtwork" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'customer-upload';

-- AlterTable: CustomOrder
ALTER TABLE "CustomOrder" ADD COLUMN IF NOT EXISTS "productionNotes" TEXT;

-- CreateTable: CustomOrderArtwork
CREATE TABLE IF NOT EXISTS "CustomOrderArtwork" (
    "id" TEXT NOT NULL,
    "customOrderId" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "slotId" TEXT,
    "role" TEXT,
    CONSTRAINT "CustomOrderArtwork_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CustomOrderArtwork_customOrderId_idx" ON "CustomOrderArtwork"("customOrderId");
CREATE INDEX IF NOT EXISTS "CustomOrderArtwork_artworkId_idx" ON "CustomOrderArtwork"("artworkId");

-- CreateTable: DropProposal
CREATE TABLE IF NOT EXISTS "DropProposal" (
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

-- CreateTable: ProposalDirection
CREATE TABLE IF NOT EXISTS "ProposalDirection" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "ProposalDirection_pkey" PRIMARY KEY ("proposalId", "id")
);

-- CreateTable: ProposalVote
CREATE TABLE IF NOT EXISTS "ProposalVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProposalVote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProposalVote_proposalId_userId_key" ON "ProposalVote"("proposalId", "userId");
CREATE INDEX IF NOT EXISTS "ProposalVote_proposalId_idx" ON "ProposalVote"("proposalId");
CREATE INDEX IF NOT EXISTS "ProposalVote_userId_idx" ON "ProposalVote"("userId");

-- CreateTable: SubmittedIdea
CREATE TABLE IF NOT EXISTS "SubmittedIdea" (
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
CREATE INDEX IF NOT EXISTS "SubmittedIdea_userId_idx" ON "SubmittedIdea"("userId");
CREATE INDEX IF NOT EXISTS "SubmittedIdea_proposalId_idx" ON "SubmittedIdea"("proposalId");
CREATE INDEX IF NOT EXISTS "SubmittedIdea_status_idx" ON "SubmittedIdea"("status");

-- CreateTable: PassportRule
CREATE TABLE IF NOT EXISTS "PassportRule" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "stampsGoal" INTEGER NOT NULL DEFAULT 8,
    "stampRule" TEXT NOT NULL DEFAULT 'One stamp for each eligible completed, paid order.',
    "rewardDescription" TEXT NOT NULL DEFAULT 'A free mini sticker of your choice',
    "rewardValueCap" DECIMAL(12,2),
    "seriesGoal" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PassportRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CustomerStamp
CREATE TABLE IF NOT EXISTS "CustomerStamp" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerStamp_userId_orderId_key" ON "CustomerStamp"("userId", "orderId");
CREATE INDEX IF NOT EXISTS "CustomerStamp_userId_idx" ON "CustomerStamp"("userId");
CREATE INDEX IF NOT EXISTS "CustomerStamp_orderId_idx" ON "CustomerStamp"("orderId");

-- CreateTable: PassportRewardRedemption
CREATE TABLE IF NOT EXISTS "PassportRewardRedemption" (
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
CREATE INDEX IF NOT EXISTS "PassportRewardRedemption_userId_idx" ON "PassportRewardRedemption"("userId");
CREATE INDEX IF NOT EXISTS "PassportRewardRedemption_status_idx" ON "PassportRewardRedemption"("status");

-- Foreign key constraints (using DO block to safely avoid duplicate constraint errors)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomOrderArtwork_customOrderId_fkey') THEN
        ALTER TABLE "CustomOrderArtwork" ADD CONSTRAINT "CustomOrderArtwork_customOrderId_fkey" FOREIGN KEY ("customOrderId") REFERENCES "CustomOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomOrderArtwork_artworkId_fkey') THEN
        ALTER TABLE "CustomOrderArtwork" ADD CONSTRAINT "CustomOrderArtwork_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "CustomArtwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProposalDirection_proposalId_fkey') THEN
        ALTER TABLE "ProposalDirection" ADD CONSTRAINT "ProposalDirection_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "DropProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProposalVote_proposalId_fkey') THEN
        ALTER TABLE "ProposalVote" ADD CONSTRAINT "ProposalVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "DropProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProposalVote_proposalId_directionId_fkey') THEN
        ALTER TABLE "ProposalVote" ADD CONSTRAINT "ProposalVote_proposalId_directionId_fkey" FOREIGN KEY ("proposalId", "directionId") REFERENCES "ProposalDirection"("proposalId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProposalVote_userId_fkey') THEN
        ALTER TABLE "ProposalVote" ADD CONSTRAINT "ProposalVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubmittedIdea_userId_fkey') THEN
        ALTER TABLE "SubmittedIdea" ADD CONSTRAINT "SubmittedIdea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubmittedIdea_proposalId_fkey') THEN
        ALTER TABLE "SubmittedIdea" ADD CONSTRAINT "SubmittedIdea_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "DropProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerStamp_userId_fkey') THEN
        ALTER TABLE "CustomerStamp" ADD CONSTRAINT "CustomerStamp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerStamp_orderId_fkey') THEN
        ALTER TABLE "CustomerStamp" ADD CONSTRAINT "CustomerStamp_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PassportRewardRedemption_userId_fkey') THEN
        ALTER TABLE "PassportRewardRedemption" ADD CONSTRAINT "PassportRewardRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

