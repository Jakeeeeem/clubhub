-- Add team_id to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Add status to listing_applications
ALTER TABLE listing_applications ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'; -- pending, shortlisted, rejected, accepted, invited
