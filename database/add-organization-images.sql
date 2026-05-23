-- Quick fix: Add images column to organizations table
-- Run this SQL directly in your database

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_organizations_images ON organizations USING GIN(images);

COMMENT ON COLUMN organizations.images IS 'Array of image URLs for organization gallery (max 5)';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organizations' AND column_name = 'images';
