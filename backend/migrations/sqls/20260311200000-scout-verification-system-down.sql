DROP TABLE IF EXISTS scout_verification_requests;

-- We don't necessarily want to drop columns in a down migration if they might contain critical data,
-- but for completeness:
ALTER TABLE staff DROP COLUMN IF EXISTS is_verified_scout;
ALTER TABLE staff DROP COLUMN IF EXISTS scout_verification_status;
ALTER TABLE staff DROP COLUMN IF EXISTS club_verified_scout;
ALTER TABLE users DROP COLUMN IF EXISTS is_verified_scout;
ALTER TABLE users DROP COLUMN IF EXISTS scout_verification_status;
