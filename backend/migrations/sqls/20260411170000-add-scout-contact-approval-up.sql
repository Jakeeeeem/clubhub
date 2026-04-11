-- Add approval fields to scout_contact_requests for parental gating
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scout_contact_requests' AND column_name='approval_token'
    ) THEN
        ALTER TABLE scout_contact_requests ADD COLUMN approval_token UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scout_contact_requests' AND column_name='approval_expires_at'
    ) THEN
        ALTER TABLE scout_contact_requests ADD COLUMN approval_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scout_contact_requests' AND column_name='parent_response_at'
    ) THEN
        ALTER TABLE scout_contact_requests ADD COLUMN parent_response_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scout_contact_requests' AND column_name='contact_info_revealed_at'
    ) THEN
        ALTER TABLE scout_contact_requests ADD COLUMN contact_info_revealed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scout_contact_requests' AND column_name='deny_reason'
    ) THEN
        ALTER TABLE scout_contact_requests ADD COLUMN deny_reason TEXT;
    END IF;
END $$;
