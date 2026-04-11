-- Remove approval fields from scout_contact_requests
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scout_contact_requests' AND column_name='approval_token'
    ) THEN
        ALTER TABLE scout_contact_requests DROP COLUMN approval_token;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scout_contact_requests' AND column_name='approval_expires_at'
    ) THEN
        ALTER TABLE scout_contact_requests DROP COLUMN approval_expires_at;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scout_contact_requests' AND column_name='parent_response_at'
    ) THEN
        ALTER TABLE scout_contact_requests DROP COLUMN parent_response_at;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scout_contact_requests' AND column_name='contact_info_revealed_at'
    ) THEN
        ALTER TABLE scout_contact_requests DROP COLUMN contact_info_revealed_at;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scout_contact_requests' AND column_name='deny_reason'
    ) THEN
        ALTER TABLE scout_contact_requests DROP COLUMN deny_reason;
    END IF;
END $$;
