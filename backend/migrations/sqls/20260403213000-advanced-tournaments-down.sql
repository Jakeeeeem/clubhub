-- Down Migration: Advanced Tournament Management Enhancements

ALTER TABLE events DROP COLUMN IF EXISTS is_public;

ALTER TABLE tournament_matches DROP COLUMN IF EXISTS video_access;
ALTER TABLE tournament_matches DROP COLUMN IF EXISTS video_price;
ALTER TABLE tournament_matches DROP COLUMN IF EXISTS video_url;
ALTER TABLE tournament_matches DROP COLUMN IF EXISTS duration;

ALTER TABLE tournament_teams DROP COLUMN IF EXISTS created_by_user_id;
ALTER TABLE tournament_teams DROP COLUMN IF EXISTS payment_status;
ALTER TABLE tournament_teams DROP COLUMN IF EXISTS payment_intent_id;

-- Revert constraints on listings
DO $$ 
BEGIN
    ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check CHECK (listing_type IN ('player', 'staff', 'trial', 'other'));

DROP TRIGGER IF EXISTS update_tournament_invites_updated_at ON tournament_invites;
DROP TABLE IF EXISTS tournament_invites;
