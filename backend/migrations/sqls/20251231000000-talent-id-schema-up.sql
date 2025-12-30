-- Add height column to players table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'height') THEN
        ALTER TABLE players ADD COLUMN height VARCHAR(10);
    END IF;
END $$;

-- Bibs table
CREATE TABLE IF NOT EXISTS bibs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    color VARCHAR(50) NOT NULL,
    number VARCHAR(10) NOT NULL,
    size VARCHAR(20),
    status VARCHAR(20) CHECK (status IN ('available', 'assigned', 'lost')) DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(club_id, color, number)
);

-- Talent ID Registrations (Guest registration for specific events)
CREATE TABLE IF NOT EXISTS talent_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    position VARCHAR(50),
    height VARCHAR(10),
    bib_number VARCHAR(10), -- Assigned bib number (manual or auto)
    bib_color VARCHAR(50),  -- Assigned bib color
    status VARCHAR(20) CHECK (status IN ('registered', 'checked_in', 'declined')) DEFAULT 'registered',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, email)
);

-- Event Schedules (Day timeline)
CREATE TABLE IF NOT EXISTS event_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    format VARCHAR(50), -- e.g. '3v3', '5v5', '11v11'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event Groups (For sorting players)
CREATE TABLE IF NOT EXISTS event_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g. 'Group A', 'Red Team'
    coach_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event Group Players (Junction table)
CREATE TABLE IF NOT EXISTS event_group_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES event_groups(id) ON DELETE CASCADE,
    talent_registration_id UUID REFERENCES talent_registrations(id) ON DELETE CASCADE, -- For guests
    player_id UUID REFERENCES players(id) ON DELETE CASCADE, -- For existing members
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, talent_registration_id),
    UNIQUE(group_id, player_id)
);

-- Add triggers for updated_at
CREATE TRIGGER update_bibs_updated_at BEFORE UPDATE ON bibs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_talent_registrations_updated_at BEFORE UPDATE ON talent_registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_schedules_updated_at BEFORE UPDATE ON event_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_groups_updated_at BEFORE UPDATE ON event_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_group_players_updated_at BEFORE UPDATE ON event_group_players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
