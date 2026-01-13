-- Rollback QR check-in system

DROP INDEX IF EXISTS idx_tournament_checkins_tournament;
DROP INDEX IF EXISTS idx_venue_checkins_venue;
DROP INDEX IF EXISTS idx_event_checkins_user;
DROP INDEX IF EXISTS idx_event_checkins_event;

DROP TABLE IF EXISTS tournament_checkins;
DROP TABLE IF EXISTS venue_checkins;
DROP TABLE IF EXISTS event_checkins;
