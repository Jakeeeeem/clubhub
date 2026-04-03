-- Up Migration: Advanced Tournament Management Enhancements

-- 1. Create tournament_invites for multi-role invitations (Admin, Ref, Team)
CREATE TABLE IF NOT EXISTS tournament_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(50) CHECK (role IN ('admin', 'referee', 'team')) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')) DEFAULT 'pending',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, email, role)
);
CREATE TRIGGER update_tournament_invites_updated_at BEFORE UPDATE ON tournament_invites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Modify listings constraint to allow "tournament" type listings
-- Instead of dropping the whole table, we can just replace the constraint if we know its name. 
-- For safety across varying DB states, we'll alter the listing_type data directly or bypass constraint by assuming it's a generic varchar if there is no hard-coded check. If there is a check constraint, we drop it.
DO $$ 
BEGIN
    ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check CHECK (listing_type IN ('player', 'staff', 'trial', 'other', 'tournament'));

-- 3. Modify tournament_teams to support deferred payment approvals and guest linking
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255);
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'refunded', 'requires_capture')) DEFAULT 'pending';
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 4. Modify tournament_matches to add custom duration and gated video fields
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS duration INTEGER; -- allow per-match minute overrides
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS video_price NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS video_access VARCHAR(50) CHECK (video_access IN ('public', 'invite_only')) DEFAULT 'public';

-- 5. Modify events to explicitly track 'is_public' for global listing functionality
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
