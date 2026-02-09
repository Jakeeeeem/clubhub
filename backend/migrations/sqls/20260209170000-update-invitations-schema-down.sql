-- Revert changes to invitations table
ALTER TABLE invitations 
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS last_name,
DROP COLUMN IF EXISTS date_of_birth,
DROP COLUMN IF EXISTS team_id,
DROP COLUMN IF EXISTS is_public,
DROP COLUMN IF EXISTS personal_message;
