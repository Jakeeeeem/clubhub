-- Migration: Add detailed performance stats to player_ratings
ALTER TABLE player_ratings 
ADD COLUMN IF NOT EXISTS goals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS assists INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS yellow_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS red_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_played INTEGER DEFAULT 0;

-- Create an activity log table for player history if it doesn't exist
CREATE TABLE IF NOT EXISTS player_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'goal', 'assist', 'card', 'match', 'training'
    description TEXT,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_player_activities_player_id ON player_activities(player_id);
CREATE INDEX IF NOT EXISTS idx_player_activities_type ON player_activities(activity_type);
