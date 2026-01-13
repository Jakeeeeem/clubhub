-- Venue Booking System Tables

-- Venues table
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    capacity INT,
    facilities JSONB DEFAULT '[]'::jsonb,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Venue bookings table
CREATE TABLE IF NOT EXISTS venue_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    total_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_booking_time CHECK (end_time > start_time)
);

-- Venue availability rules (optional - for recurring availability)
CREATE TABLE IF NOT EXISTS venue_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    day_of_week INT, -- 0=Sunday, 1=Monday, etc.
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_venues_organization ON venues(organization_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_venue ON venue_bookings(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_user ON venue_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_time ON venue_bookings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_venue_availability_venue ON venue_availability(venue_id);

-- Comments
COMMENT ON TABLE venues IS 'Sports venues/facilities available for booking';
COMMENT ON TABLE venue_bookings IS 'Venue booking records';
COMMENT ON TABLE venue_availability IS 'Recurring availability rules for venues';
