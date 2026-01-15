-- Add philosophy column if it doesn't exist
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS philosophy TEXT;