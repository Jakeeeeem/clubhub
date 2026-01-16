/* Replace with your SQL commands */
ALTER TABLE players ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE players ADD COLUMN IF NOT EXISTS sport VARCHAR(100);
ALTER TABLE players ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE players ADD COLUMN IF NOT EXISTS bio TEXT;

CREATE TABLE IF NOT EXISTS player_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    club_name VARCHAR(255),
    team_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    achievements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_history_player_id ON player_history(player_id);
