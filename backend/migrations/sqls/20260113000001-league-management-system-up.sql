-- League Management System Tables

-- Leagues table
CREATE TABLE IF NOT EXISTS leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    season VARCHAR(100),
    sport VARCHAR(100),
    description TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- League teams (teams participating in a league)
CREATE TABLE IF NOT EXISTS league_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    points INT DEFAULT 0,
    wins INT DEFAULT 0,
    draws INT DEFAULT 0,
    losses INT DEFAULT 0,
    goals_for INT DEFAULT 0,
    goals_against INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(league_id, team_id)
);

-- Fixtures/Matches
CREATE TABLE IF NOT EXISTS fixtures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    home_team_id UUID REFERENCES teams(id),
    away_team_id UUID REFERENCES teams(id),
    scheduled_time TIMESTAMP,
    pitch VARCHAR(100),
    referee_id UUID REFERENCES users(id),
    home_score INT DEFAULT 0,
    away_score INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    match_week INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT different_teams CHECK (home_team_id != away_team_id)
);

-- Referee availability
CREATE TABLE IF NOT EXISTS referee_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(referee_id, available_date)
);

-- Pitch/Venue assignments for leagues
CREATE TABLE IF NOT EXISTS league_pitches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    pitch_name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    capacity INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Match events (goals, cards, substitutions)
CREATE TABLE IF NOT EXISTS match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id UUID REFERENCES fixtures(id) ON DELETE CASCADE,
    event_type VARCHAR(50), -- goal, yellow_card, red_card, substitution
    team_id UUID REFERENCES teams(id),
    player_id UUID REFERENCES players(id),
    minute INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leagues_organization ON leagues(organization_id);
CREATE INDEX IF NOT EXISTS idx_league_teams_league ON league_teams(league_id);
CREATE INDEX IF NOT EXISTS idx_league_teams_team ON league_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_league ON fixtures(league_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_teams ON fixtures(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_referee ON fixtures(referee_id);
CREATE INDEX IF NOT EXISTS idx_referee_availability_referee ON referee_availability(referee_id);
CREATE INDEX IF NOT EXISTS idx_league_pitches_league ON league_pitches(league_id);
CREATE INDEX IF NOT EXISTS idx_match_events_fixture ON match_events(fixture_id);

-- Comments
COMMENT ON TABLE leagues IS 'Sports leagues/competitions';
COMMENT ON TABLE league_teams IS 'Teams participating in leagues with standings';
COMMENT ON TABLE fixtures IS 'League matches/fixtures';
COMMENT ON TABLE referee_availability IS 'Referee availability for matches';
COMMENT ON TABLE league_pitches IS 'Pitches/venues assigned to leagues';
COMMENT ON TABLE match_events IS 'In-match events (goals, cards, etc.)';
