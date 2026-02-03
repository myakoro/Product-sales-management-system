-- Migration: Add unique constraint to new_product_candidates
-- This migration adds a composite unique constraint on (product_code, sample_sku)

-- First, remove any duplicate rows (keep the oldest one)
DELETE FROM new_product_candidates
WHERE id NOT IN (
    SELECT MIN(id)
    FROM new_product_candidates
    GROUP BY product_code, sample_sku
);

-- Then create the unique index
CREATE UNIQUE INDEX IF NOT EXISTS "new_product_candidates_product_code_sample_sku_key" 
ON "new_product_candidates"("product_code", "sample_sku");
