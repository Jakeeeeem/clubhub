-- Migration for Phase 1: Core Team Features
-- 1. Add recurrence columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(50);
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_id UUID;
ALTER TABLE events ADD COLUMN IF NOT EXISTS require_decline_reason BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS notification_schedule JSONB;

-- 2. Create event_players junction table for assigning specific players to events
CREATE TABLE IF NOT EXISTS event_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, player_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_event_players_event_id ON event_players(event_id);
CREATE INDEX IF NOT EXISTS idx_event_players_player_id ON event_players(player_id);
