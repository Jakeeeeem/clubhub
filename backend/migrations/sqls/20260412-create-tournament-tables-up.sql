-- Create tournament-related tables and compatibility view
-- Safe: uses IF NOT EXISTS and drops/recreates view for idempotence

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- Pitches used by tournaments
CREATE TABLE IF NOT EXISTS tournament_pitches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  pitch_type VARCHAR(50),
  pitch_size VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament stages (group stage, knockouts, etc.)
CREATE TABLE IF NOT EXISTS tournament_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  sequence INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams registered to a tournament (lightweight mapping)
CREATE TABLE IF NOT EXISTS tournament_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_name VARCHAR(255) NOT NULL,
  internal_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches for tournaments
CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES tournament_stages(id) ON DELETE CASCADE,
  home_team_id UUID REFERENCES tournament_teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES tournament_teams(id) ON DELETE SET NULL,
  round_number INTEGER DEFAULT 1,
  match_number INTEGER,
  pitch_id UUID REFERENCES tournament_pitches(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  home_score INTEGER,
  away_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compatibility: provide a `tournaments` view for code that expects that table
DROP VIEW IF EXISTS tournaments;
CREATE VIEW tournaments AS
  SELECT id, title, description, event_date, event_time, club_id, created_by
  FROM events
  WHERE event_type = 'tournament';

COMMIT;
