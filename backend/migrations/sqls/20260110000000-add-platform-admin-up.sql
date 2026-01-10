-- Add platform admin flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_platform_admin ON users(is_platform_admin) WHERE is_platform_admin = TRUE;

-- Add comment
COMMENT ON COLUMN users.is_platform_admin IS 'Platform-level administrator with access to all organizations and system settings';
