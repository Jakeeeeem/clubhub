-- Run this SQL in your Render PostgreSQL shell
-- This adds the images column to the organizations table

-- Add images column
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_images 
ON organizations USING GIN(images);

-- Verify it worked
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'organizations' AND column_name = 'images';

-- You should see output like:
-- column_name | data_type | is_nullable
-- images      | ARRAY     | YES
