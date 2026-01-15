-- Add images array column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_images ON organizations USING GIN(images);

COMMENT ON COLUMN organizations.images IS 'Array of image URLs for organization gallery (max 5)';
