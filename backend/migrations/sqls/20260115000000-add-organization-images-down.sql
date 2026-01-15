-- Remove images column from organizations table
ALTER TABLE organizations 
DROP COLUMN IF EXISTS images;

-- Drop index
DROP INDEX IF EXISTS idx_organizations_images;
