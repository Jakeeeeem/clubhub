/* Replace with your SQL commands */
ALTER TABLE players ADD COLUMN location VARCHAR(255);
ALTER TABLE players ADD COLUMN sport VARCHAR(100);
ALTER TABLE players ADD COLUMN gender VARCHAR(20);
ALTER TABLE players ADD COLUMN bio TEXT;

CREATE TABLE player_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    club_name VARCHAR(255),
    team_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    achievements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_player_history_player_id ON player_history(player_id);
