-- QR Check-in System Tables

-- Event check-ins
CREATE TABLE IF NOT EXISTS event_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    checkin_time TIMESTAMP DEFAULT NOW(),
    checkin_method VARCHAR(50) DEFAULT 'manual', -- qr, manual, location
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Venue check-ins
CREATE TABLE IF NOT EXISTS venue_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES venue_bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    checkin_time TIMESTAMP DEFAULT NOW(),
    checkin_method VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tournament check-ins
CREATE TABLE IF NOT EXISTS tournament_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    checkin_time TIMESTAMP DEFAULT NOW(),
    checkin_method VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_checkins_event ON event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_user ON event_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_checkins_venue ON venue_checkins(venue_id);
CREATE INDEX IF NOT EXISTS idx_tournament_checkins_tournament ON tournament_checkins(tournament_id);

COMMENT ON TABLE event_checkins IS 'Event attendance tracking via QR or manual check-in';
COMMENT ON TABLE venue_checkins IS 'Venue booking check-ins';
COMMENT ON TABLE tournament_checkins IS 'Tournament team check-ins';
