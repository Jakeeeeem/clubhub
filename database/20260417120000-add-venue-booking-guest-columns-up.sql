-- Add guest booking columns and token expiry to venue_bookings
BEGIN;
ALTER TABLE venue_bookings
    ADD COLUMN IF NOT EXISTS guest_token UUID,
    ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS guest_first_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS guest_last_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS guest_token_expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS accepted_tos BOOLEAN DEFAULT false;
COMMIT;
