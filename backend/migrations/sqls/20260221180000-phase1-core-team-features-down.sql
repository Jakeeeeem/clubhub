-- Down migration for Phase 1: Core Team Features
DROP TABLE IF EXISTS event_players;

ALTER TABLE events DROP COLUMN IF EXISTS recurrence_pattern;
ALTER TABLE events DROP COLUMN IF EXISTS recurrence_end_date;
ALTER TABLE events DROP COLUMN IF EXISTS recurrence_id;
ALTER TABLE events DROP COLUMN IF EXISTS require_decline_reason;
ALTER TABLE events DROP COLUMN IF EXISTS notification_schedule;
