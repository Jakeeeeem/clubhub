-- Add granular staff permission flags as boolean columns and backfill from existing permissions array
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS can_manage_finances BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_manage_players BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_manage_events BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_manage_listings BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_manage_scouting BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_manage_venues BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_manage_tournaments BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_manage_staff BOOLEAN DEFAULT FALSE;

-- Backfill boolean flags from the existing `permissions` text[] when present
UPDATE staff SET can_manage_finances = TRUE WHERE permissions @> ARRAY['finances'];
UPDATE staff SET can_manage_players = TRUE WHERE permissions @> ARRAY['players'];
UPDATE staff SET can_manage_events = TRUE WHERE permissions @> ARRAY['events'];
UPDATE staff SET can_manage_listings = TRUE WHERE permissions @> ARRAY['listings'];
UPDATE staff SET can_manage_scouting = TRUE WHERE permissions @> ARRAY['scouting'];
UPDATE staff SET can_manage_venues = TRUE WHERE permissions @> ARRAY['venues'];
UPDATE staff SET can_manage_tournaments = TRUE WHERE permissions @> ARRAY['tournaments'];
UPDATE staff SET can_manage_staff = TRUE WHERE permissions @> ARRAY['staff'];

-- Optional: keep the original permissions array for compatibility
-- Note: future code should prefer boolean flags for quick checks
