-- Create table for scout verification requests
CREATE TABLE IF NOT EXISTS scout_verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    club_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    id_card_url TEXT,
    club_letter_url TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add verification columns to staff table
-- Note: is_verified_scout might already exist, so we use IF NOT EXISTS logic
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='is_verified_scout') THEN
        ALTER TABLE staff ADD COLUMN is_verified_scout BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='scout_verification_status') THEN
        ALTER TABLE staff ADD COLUMN scout_verification_status VARCHAR(20) DEFAULT 'unverified';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='club_verified_scout') THEN
        ALTER TABLE staff ADD COLUMN club_verified_scout BOOLEAN DEFAULT false;
    END IF;

    -- Add verification columns to users table for individual scouts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_verified_scout') THEN
        ALTER TABLE users ADD COLUMN is_verified_scout BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='scout_verification_status') THEN
        ALTER TABLE users ADD COLUMN scout_verification_status VARCHAR(20) DEFAULT 'unverified';
    END IF;
END $$;
