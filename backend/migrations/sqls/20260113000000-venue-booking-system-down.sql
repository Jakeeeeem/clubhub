-- Rollback venue booking system

DROP INDEX IF EXISTS idx_venue_availability_venue;
DROP INDEX IF EXISTS idx_venue_bookings_time;
DROP INDEX IF EXISTS idx_venue_bookings_user;
DROP INDEX IF EXISTS idx_venue_bookings_venue;
DROP INDEX IF EXISTS idx_venues_organization;

DROP TABLE IF EXISTS venue_availability;
DROP TABLE IF EXISTS venue_bookings;
DROP TABLE IF EXISTS venues;
