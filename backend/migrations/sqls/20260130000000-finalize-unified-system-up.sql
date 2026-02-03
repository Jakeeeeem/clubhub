-- Finalize the transition from 'clubs' to 'organizations'
-- 1. Add missing columns to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS types TEXT[];

-- 2. Drop the unique constraint on owner_id in clubs (if it exists) 
-- This constraint was a relic of the one-user-one-club system
DROP INDEX IF EXISTS idx_clubs_owner_id;

-- 3. Update all foreign keys to reference organizations instead of clubs
-- Players
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_club_id_fkey;
ALTER TABLE players ADD CONSTRAINT players_club_id_fkey FOREIGN KEY (club_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Teams
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_club_id_fkey;
ALTER TABLE teams ADD CONSTRAINT teams_club_id_fkey FOREIGN KEY (club_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Events
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_club_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_club_id_fkey FOREIGN KEY (club_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Staff
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_club_id_fkey;
ALTER TABLE staff ADD CONSTRAINT staff_club_id_fkey FOREIGN KEY (club_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Club Applications
ALTER TABLE club_applications DROP CONSTRAINT IF EXISTS club_applications_club_id_fkey;
ALTER TABLE club_applications ADD CONSTRAINT club_applications_club_id_fkey FOREIGN KEY (club_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- 4. Sync any missing data from clubs to organizations
INSERT INTO organizations (id, name, description, location, sport, owner_id, created_at, updated_at)
SELECT id, name, description, location, sport, owner_id, created_at, updated_at
FROM clubs
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    location = EXCLUDED.location,
    sport = EXCLUDED.sport,
    updated_at = EXCLUDED.updated_at;

-- 5. Create a trigger to keep the legacy clubs table in sync for any remaining legacy queries
CREATE OR REPLACE FUNCTION sync_org_to_club() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO clubs (id, name, description, location, sport, owner_id, created_at, updated_at)
    VALUES (NEW.id, NEW.name, NEW.description, NEW.location, NEW.sport, NEW.owner_id, NEW.created_at, NEW.updated_at)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        location = EXCLUDED.location,
        sport = EXCLUDED.sport,
        updated_at = EXCLUDED.updated_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_org_to_club ON organizations;
CREATE TRIGGER trigger_sync_org_to_club
AFTER INSERT OR UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION sync_org_to_club();
