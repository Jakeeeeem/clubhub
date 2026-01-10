-- Remove platform admin flag
ALTER TABLE users DROP COLUMN IF EXISTS is_platform_admin;

-- Drop index
DROP INDEX IF EXISTS idx_users_platform_admin;
