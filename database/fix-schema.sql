-- Fix missing columns for seed-complete.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT true;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE players ADD COLUMN IF NOT EXISTS sport VARCHAR(100);
ALTER TABLE players ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- Create missing listings table
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    positions TEXT[],
    requirements TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
