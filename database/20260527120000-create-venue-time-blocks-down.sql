-- Down migration for 20260527120000-create-venue-time-blocks-up.sql
-- Drops the venue_time_blocks and venue_opening_hours tables

DROP TABLE IF EXISTS venue_time_blocks CASCADE;
DROP TABLE IF EXISTS venue_opening_hours CASCADE;
