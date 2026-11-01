-- Additive migration linking CustomOrder to CustomArtwork
ALTER TABLE "CustomOrder" ADD COLUMN IF NOT EXISTS "artworkId" TEXT;

CREATE INDEX IF NOT EXISTS "CustomOrder_artworkId_idx" ON "CustomOrder"("artworkId");

DO $$ BEGIN
  ALTER TABLE "CustomOrder" ADD CONSTRAINT "CustomOrder_artworkId_fkey" 
    FOREIGN KEY ("artworkId") REFERENCES "CustomArtwork"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

