BEGIN;
DROP INDEX IF EXISTS idx_video_purchases_user_match;
DROP TABLE IF EXISTS video_purchases;
COMMIT;
