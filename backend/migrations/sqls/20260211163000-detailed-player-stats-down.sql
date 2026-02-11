-- Migration: Remove detailed performance stats and activity log
DROP TABLE IF EXISTS player_activities;

ALTER TABLE player_ratings 
DROP COLUMN IF EXISTS goals,
DROP COLUMN IF EXISTS assists,
DROP COLUMN IF EXISTS yellow_cards,
DROP COLUMN IF EXISTS red_cards,
DROP COLUMN IF EXISTS minutes_played;
