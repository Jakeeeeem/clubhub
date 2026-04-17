-- Down migration for schedule and live
BEGIN;
DROP TABLE IF EXISTS match_live_updates;
DROP TABLE IF EXISTS schedule_applications;
DROP TABLE IF EXISTS schedule_templates;
COMMIT;
