-- Rollback player history

DROP INDEX IF EXISTS idx_player_history_player;
DROP TABLE IF EXISTS player_history;
