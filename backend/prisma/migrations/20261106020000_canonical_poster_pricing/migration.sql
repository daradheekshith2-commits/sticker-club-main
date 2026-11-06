-- Migration: 20261106020000_canonical_poster_pricing
-- Purpose: Authoritatively enforce canonical poster pricing across products, descriptions, and variants.
-- Canonical Poster Prices:
--   A5 (14.8 × 21 cm):  ₹90.00
--   A4 (21 × 29.7 cm):  ₹120.00
--   A3 (29.7 × 42 cm):  ₹150.00

-- 1. Update poster base price and descriptions idempotently
UPDATE "Product"
SET 
  price = 90.00,
  description = REGEXP_REPLACE(
    description,
    'Available in A5\s*\([^)]*\),\s*A4\s*\([^)]*\),\s*(and\s*)?A3\s*\([^)]*\)',
    'Available in A5 (₹90), A4 (₹120), and A3 (₹150)',
    'g'
  )
WHERE category = 'posters' OR "productType" = 'poster';

-- 2. Update existing poster variants to match canonical pricing
UPDATE "ProductVariant" pv
SET price = 90.00
FROM "Product" p
WHERE pv."productId" = p.id
  AND (p.category = 'posters' OR p."productType" = 'poster')
  AND pv.id = 'a5';

UPDATE "ProductVariant" pv
SET price = 120.00
FROM "Product" p
WHERE pv."productId" = p.id
  AND (p.category = 'posters' OR p."productType" = 'poster')
  AND pv.id = 'a4';

UPDATE "ProductVariant" pv
SET price = 150.00
FROM "Product" p
WHERE pv."productId" = p.id
  AND (p.category = 'posters' OR p."productType" = 'poster')
  AND pv.id = 'a3';

-- 3. Delete any unauthorized / legacy custom variants from ProductVariant for posters
DELETE FROM "ProductVariant" pv
USING "Product" p
WHERE pv."productId" = p.id
  AND (p.category = 'posters' OR p."productType" = 'poster')
  AND pv.id NOT IN ('a5', 'a4', 'a3');
