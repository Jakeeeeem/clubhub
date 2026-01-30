-- Rollback: Remove player performance stats
ALTER TABLE players 
DROP COLUMN IF EXISTS goals,
DROP COLUMN IF EXISTS assists,
DROP COLUMN IF EXISTS yellow_cards,
DROP COLUMN IF EXISTS red_cards,
DROP COLUMN IF EXISTS matches_played;
