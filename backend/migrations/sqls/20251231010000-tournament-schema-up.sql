-- Tournament Teams (Registered teams for an event)
CREATE TABLE IF NOT EXISTS tournament_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected', 'checked_in')) DEFAULT 'pending',
    group_id UUID, -- Assigned group (optional initial assignment)
    stats JSONB DEFAULT '{}', -- Cache for wins, losses, points etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament Stages (e.g. "Group Stage", "Quarter Finals", "Semi Finals")
CREATE TABLE IF NOT EXISTS tournament_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('league', 'knockout')) NOT NULL,
    sequence INTEGER NOT NULL, -- Order of stages (1, 2, 3)
    settings JSONB DEFAULT '{}', -- Config like points per win, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament Matches
CREATE TABLE IF NOT EXISTS tournament_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id UUID NOT NULL REFERENCES tournament_stages(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE, -- Denormalized for easier queries
    
    home_team_id UUID REFERENCES tournament_teams(id) ON DELETE SET NULL,
    away_team_id UUID REFERENCES tournament_teams(id) ON DELETE SET NULL,
    
    -- Placeholder mapping for bracket generation (e.g. "Winner of Match X")
    home_team_placeholder VARCHAR(255), 
    away_team_placeholder VARCHAR(255),

    home_score INTEGER,
    away_score INTEGER,
    
    status VARCHAR(50) CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')) DEFAULT 'scheduled',
    start_time TIMESTAMP WITH TIME ZONE,
    field_location VARCHAR(100),
    
    -- Bracket Progression
    next_match_id UUID REFERENCES tournament_matches(id) ON DELETE SET NULL,
    progress_to_home BOOLEAN, -- If true, winner goes to home slot of next match; else away
    
    round_number INTEGER, -- 1 = Ro16, 2 = QF, etc. or separate Round table
    match_number INTEGER, -- For bracket ordering
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at triggers
CREATE TRIGGER update_tournament_teams_updated_at BEFORE UPDATE ON tournament_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournament_stages_updated_at BEFORE UPDATE ON tournament_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournament_matches_updated_at BEFORE UPDATE ON tournament_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
