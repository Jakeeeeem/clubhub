-- Create listings table for recruitment and player listings
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    listing_type VARCHAR(50) CHECK (listing_type IN ('recruitment', 'player_available', 'trial')) NOT NULL,
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    position VARCHAR(100),
    age_group VARCHAR(50),
    requirements TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create listing_applications table for tracking applications to listings
CREATE TABLE IF NOT EXISTS listing_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    applicant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    cover_letter TEXT,
    application_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(listing_id, applicant_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_listings_club_id ON listings(club_id);
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active);
CREATE INDEX IF NOT EXISTS idx_listing_applications_listing_id ON listing_applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_applications_applicant_id ON listing_applications(applicant_id);
