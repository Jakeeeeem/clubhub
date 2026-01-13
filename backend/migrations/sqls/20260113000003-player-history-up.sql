-- Add player history/previous teams table

CREATE TABLE IF NOT EXISTS player_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    team_name VARCHAR(255) NOT NULL,
    club_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    position VARCHAR(100),
    achievements TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_history_player ON player_history(player_id);

COMMENT ON TABLE player_history IS 'Player career history and previous teams';
