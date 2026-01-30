-- Migration: Enhance Tournament System
-- 1. Add Tournament Settings to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS tournament_settings JSONB DEFAULT '{"format": "11v11", "match_duration": 90, "points_per_win": 3, "points_per_draw": 1}';

-- 2. Add Link to Internal Team for tournament teams
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS internal_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- 3. Groups Table
CREATE TABLE IF NOT EXISTS tournament_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id UUID NOT NULL REFERENCES tournament_stages(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- "Group A", "Group B"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Assign teams to groups
ALTER TABLE tournament_teams ADD COLUMN IF NOT EXISTS current_group_id UUID REFERENCES tournament_groups(id) ON DELETE SET NULL;

-- 5. Match Events (Goals, Cards, etc.)
CREATE TABLE IF NOT EXISTS tournament_match_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL, -- Internal player link
    player_name_manual VARCHAR(255), -- For external players or quick entry
    event_type VARCHAR(50) NOT NULL, -- 'goal', 'yellow_card', 'red_card', 'assist'
    minute INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Update triggers
CREATE TRIGGER update_tournament_groups_updated_at BEFORE UPDATE ON tournament_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
