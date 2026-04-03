-- Up Migration: Comprehensive Teams Module Features

-- 1. Modify `events` table for advanced scheduling and rules
ALTER TABLE events ADD COLUMN IF NOT EXISTS requires_payment BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS decline_reason_mandatory BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS invite_schedule VARCHAR(50) DEFAULT 'immediate';
ALTER TABLE events ADD COLUMN IF NOT EXISTS invite_scheduled_time TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_rule VARCHAR(50);
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- 2. Create `event_invitations` table for targeted invites
CREATE TABLE IF NOT EXISTS event_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    scout_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Keeping in line with scout feature expansion
    invite_status VARCHAR(20) CHECK (invite_status IN ('pending', 'sent')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, player_id)
);
CREATE TRIGGER update_event_invitations_updated_at BEFORE UPDATE ON event_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_event_invitations_event_id ON event_invitations(event_id);

-- 3. Modify `match_results` for reviews and footage
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS game_review TEXT;

-- 4. Create `player_match_stats` for detailed post-game tracking
CREATE TABLE IF NOT EXISTS player_match_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_result_id UUID NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    minutes_played INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    individual_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_result_id, player_id)
);
CREATE TRIGGER update_player_match_stats_updated_at BEFORE UPDATE ON player_match_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_player_match_stats_match_id ON player_match_stats(match_result_id);

-- 5. Modify `tactical_formations` for animated session planners
ALTER TABLE tactical_formations ADD COLUMN IF NOT EXISTS is_animation BOOLEAN DEFAULT false;
-- Instead of renaming formation_data, we can just overload it, or add 'tactics_data' alongside.
-- Overloading JSONB is easier since we already have the column logic, but we'll add a 'frames' specific array to be clean.
ALTER TABLE tactical_formations ADD COLUMN IF NOT EXISTS frames_data JSONB; 
