BEGIN;
ALTER TABLE venue_bookings DROP COLUMN IF EXISTS guest_token;
ALTER TABLE venue_bookings DROP COLUMN IF EXISTS guest_email;
ALTER TABLE venue_bookings DROP COLUMN IF EXISTS guest_first_name;
ALTER TABLE venue_bookings DROP COLUMN IF EXISTS guest_last_name;
ALTER TABLE venue_bookings DROP COLUMN IF EXISTS guest_token_expires_at;
ALTER TABLE venue_bookings DROP COLUMN IF EXISTS accepted_tos;
COMMIT;
