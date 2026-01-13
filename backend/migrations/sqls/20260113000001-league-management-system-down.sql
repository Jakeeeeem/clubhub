-- Rollback league management system

DROP INDEX IF EXISTS idx_match_events_fixture;
DROP INDEX IF EXISTS idx_league_pitches_league;
DROP INDEX IF EXISTS idx_referee_availability_referee;
DROP INDEX IF EXISTS idx_fixtures_referee;
DROP INDEX IF EXISTS idx_fixtures_teams;
DROP INDEX IF EXISTS idx_fixtures_league;
DROP INDEX IF EXISTS idx_league_teams_team;
DROP INDEX IF EXISTS idx_league_teams_league;
DROP INDEX IF EXISTS idx_leagues_organization;

DROP TABLE IF EXISTS match_events;
DROP TABLE IF EXISTS league_pitches;
DROP TABLE IF EXISTS referee_availability;
DROP TABLE IF EXISTS fixtures;
DROP TABLE IF EXISTS league_teams;
DROP TABLE IF EXISTS leagues;
