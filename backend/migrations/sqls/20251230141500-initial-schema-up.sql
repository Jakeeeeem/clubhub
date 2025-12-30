-- ClubHub PostgreSQL Database Schema Baseline

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) CHECK (account_type IN ('adult', 'organization')) NOT NULL,
    org_types TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Clubs table
CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    philosophy TEXT,
    website VARCHAR(255),
    types TEXT[] NOT NULL,
    sport VARCHAR(100),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_count INTEGER DEFAULT 0,
    established VARCHAR(4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    date_of_birth DATE NOT NULL,
    position VARCHAR(50),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    monthly_fee DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(20) CHECK (payment_status IN ('paid', 'pending', 'overdue')) DEFAULT 'pending',
    attendance_rate INTEGER DEFAULT 85,
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_public BOOLEAN DEFAULT false,
    scouting_opt_in BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) CHECK (role IN ('coach', 'assistant-coach', 'treasurer', 'coaching-supervisor', 'referee', 'administrator')) NOT NULL,
    permissions TEXT[],
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    age_group VARCHAR(20),
    sport VARCHAR(100) NOT NULL,
    description TEXT,
    coach_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team players table
CREATE TABLE IF NOT EXISTS team_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    position VARCHAR(50),
    jersey_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, player_id),
    UNIQUE(team_id, jersey_number)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) CHECK (event_type IN ('training', 'match', 'tournament', 'camp', 'social', 'talent-id')) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    location VARCHAR(255),
    price DECIMAL(10,2) DEFAULT 0,
    capacity INTEGER,
    spots_available INTEGER,
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    opponent VARCHAR(255),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event bookings table
CREATE TABLE IF NOT EXISTS event_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    booking_status VARCHAR(20) CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
    amount_paid DECIMAL(10,2) DEFAULT 0,
    stripe_payment_intent_id VARCHAR(255),
    booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Match results table
CREATE TABLE IF NOT EXISTS match_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    home_score INTEGER NOT NULL,
    away_score INTEGER NOT NULL,
    result VARCHAR(10) CHECK (result IN ('win', 'loss', 'draw')) NOT NULL,
    match_notes TEXT,
    recorded_by UUID NOT NULL REFERENCES users(id),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player ratings table
CREATE TABLE IF NOT EXISTS player_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_result_id UUID NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_result_id, player_id)
);

-- Club applications table
CREATE TABLE IF NOT EXISTS club_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    preferred_position VARCHAR(50),
    experience_level VARCHAR(20) CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
    availability TEXT[],
    application_status VARCHAR(20) CHECK (application_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(club_id, user_id)
);

-- Availability responses table
CREATE TABLE IF NOT EXISTS availability_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    availability VARCHAR(10) CHECK (availability IN ('yes', 'no', 'maybe')) NOT NULL,
    notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, player_id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(50) CHECK (payment_type IN ('monthly_fee', 'event_booking', 'registration', 'equipment')) NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
    paid_date TIMESTAMP WITH TIME ZONE,
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) CHECK (document_type IN ('policy', 'schedule', 'form', 'guide', 'other')) NOT NULL,
    file_url VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    access_level VARCHAR(20) CHECK (access_level IN ('public', 'members', 'staff', 'admin')) DEFAULT 'members',
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tactical formations table
CREATE TABLE IF NOT EXISTS tactical_formations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    formation_type VARCHAR(20) NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    formation_data JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) CHECK (notification_type IN ('payment', 'event', 'application', 'general')) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    interval VARCHAR(20) CHECK (interval IN ('week', 'month', 'year')) DEFAULT 'month',
    active BOOLEAN DEFAULT true,
    description TEXT,
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player plans table
CREATE TABLE IF NOT EXISTS player_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_billing_date DATE,
    next_billing_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, plan_id, is_active)
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    image_url VARCHAR(500),
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product orders table
CREATE TABLE IF NOT EXISTS product_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_group VARCHAR(100),
    target_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_club_id ON staff(club_id);
CREATE INDEX IF NOT EXISTS idx_teams_club_id ON teams(club_id);
CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON teams(coach_id);
CREATE INDEX IF NOT EXISTS idx_events_club_id ON events(club_id);
CREATE INDEX IF NOT EXISTS idx_events_team_id ON events(team_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_event_bookings_event_id ON event_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_user_id ON event_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_player_id ON payments(player_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_club_applications_club_id ON club_applications(club_id);
CREATE INDEX IF NOT EXISTS idx_club_applications_user_id ON club_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers (using DO block to check if they exist before creating)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clubs_updated_at') THEN
        CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_players_updated_at') THEN
        CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_staff_updated_at') THEN
        CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_teams_updated_at') THEN
        CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_events_updated_at') THEN
        CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_event_bookings_updated_at') THEN
        CREATE TRIGGER update_event_bookings_updated_at BEFORE UPDATE ON event_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_club_applications_updated_at') THEN
        CREATE TRIGGER update_club_applications_updated_at BEFORE UPDATE ON club_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_availability_responses_updated_at') THEN
        CREATE TRIGGER update_availability_responses_updated_at BEFORE UPDATE ON availability_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payments_updated_at') THEN
        CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_documents_updated_at') THEN
        CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tactical_formations_updated_at') THEN
        CREATE TRIGGER update_tactical_formations_updated_at BEFORE UPDATE ON tactical_formations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_product_orders_updated_at') THEN
        CREATE TRIGGER update_product_orders_updated_at BEFORE UPDATE ON product_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_campaigns_updated_at') THEN
        CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
