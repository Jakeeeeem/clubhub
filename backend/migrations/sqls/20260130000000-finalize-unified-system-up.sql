-- Finalize the transition from 'clubs' to 'organizations'
-- 1. Add missing columns to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS types TEXT[];

-- 2. Drop the unique constraint on owner_id in clubs (if it exists) 
-- This constraint was a relic of the one-user-one-club system
DROP INDEX IF EXISTS idx_clubs_owner_id;

-- 3. Sync any missing data from clubs to organizations
INSERT INTO organizations (id, name, description, location, sport, owner_id, created_at, updated_at, slug, is_active, stripe_account_id)
SELECT 
    id, name, description, location, sport, owner_id, created_at, updated_at,
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')),
    true, stripe_account_id
FROM clubs
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    location = EXCLUDED.location,
    sport = EXCLUDED.sport,
    stripe_account_id = COALESCE(organizations.stripe_account_id, EXCLUDED.stripe_account_id),
    updated_at = EXCLUDED.updated_at;

-- 3a. Recover Orphans: Ensure all club_ids used in other tables exist in organizations
-- This handles dirty data where a team/player points to a club ID that no longer exists in 'clubs'
-- We need to assign a valid owner_id, so we'll use the first available user as a fallback
INSERT INTO organizations (id, name, slug, is_active, owner_id, created_at, updated_at)
SELECT DISTINCT 
    orphan_ids.club_id, 
    'Legacy Recovered Organization', 
    'recovered-' || orphan_ids.club_id::text, 
    true,
    COALESCE(
        (SELECT owner_id FROM clubs WHERE id = orphan_ids.club_id LIMIT 1),
        (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
    ),
    NOW(), 
    NOW()
FROM (
    SELECT club_id FROM players WHERE club_id IS NOT NULL
    UNION
    SELECT club_id FROM teams WHERE club_id IS NOT NULL
    UNION
    SELECT club_id FROM events WHERE club_id IS NOT NULL
    UNION
    SELECT club_id FROM staff WHERE club_id IS NOT NULL
    UNION
    SELECT club_id FROM club_applications WHERE club_id IS NOT NULL
) orphan_ids
WHERE orphan_ids.club_id NOT IN (SELECT id FROM organizations)
ON CONFLICT (id) DO NOTHING;

-- 4. Update all foreign keys to reference organizations instead of clubs
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
