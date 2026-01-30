-- Down Migration: Revert Tournament System Enhancement
DROP TABLE IF EXISTS tournament_match_events;
ALTER TABLE tournament_teams DROP COLUMN IF EXISTS current_group_id;
DROP TABLE IF EXISTS tournament_groups;
ALTER TABLE tournament_teams DROP COLUMN IF EXISTS internal_team_id;
ALTER TABLE events DROP COLUMN IF EXISTS tournament_settings;
