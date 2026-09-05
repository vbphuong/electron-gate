-- Migration: Upgrade product_images.embedding from vector(512) to vector(768)
-- Run this against your PostgreSQL database before starting the application.
-- NOTE: Any existing non-NULL embedding values will be reset to NULL
--       because they were computed with CLIP (512-d) and are incompatible
--       with the new SigLIP (768-d) model. Re-embed them via Celery tasks.

-- Step 1: Clear existing embeddings (dimension mismatch would cause errors)
UPDATE product_images SET embedding = NULL WHERE embedding IS NOT NULL;

-- Step 2: Change column type
ALTER TABLE product_images
  ALTER COLUMN embedding TYPE vector(768);
