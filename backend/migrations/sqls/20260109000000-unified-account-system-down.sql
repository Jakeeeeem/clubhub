-- Rollback migration for unified account system

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_member_count ON organization_members;
DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences;
DROP TRIGGER IF EXISTS trigger_organization_members_updated_at ON organization_members;
DROP TRIGGER IF EXISTS trigger_organizations_updated_at ON organizations;

-- Drop functions
DROP FUNCTION IF EXISTS update_organization_member_count();
DROP FUNCTION IF EXISTS update_user_preferences_updated_at();
DROP FUNCTION IF EXISTS update_organization_members_updated_at();
DROP FUNCTION IF EXISTS update_organizations_updated_at();

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
