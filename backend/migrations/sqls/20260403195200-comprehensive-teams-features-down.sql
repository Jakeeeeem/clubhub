-- Down Migration: Comprehensive Teams Module Features

-- 5. Revert `tactical_formations`
ALTER TABLE tactical_formations DROP COLUMN IF EXISTS frames_data;
ALTER TABLE tactical_formations DROP COLUMN IF EXISTS is_animation;

-- 4. Drop `player_match_stats`
DROP TABLE IF EXISTS player_match_stats CASCADE;

-- 3. Revert `match_results`
ALTER TABLE match_results DROP COLUMN IF EXISTS game_review;
ALTER TABLE match_results DROP COLUMN IF EXISTS video_url;

-- 2. Drop `event_invitations`
DROP TABLE IF EXISTS event_invitations CASCADE;

-- 1. Revert `events`
ALTER TABLE events DROP COLUMN IF EXISTS image_url;
ALTER TABLE events DROP COLUMN IF EXISTS recurrence_end_date;
ALTER TABLE events DROP COLUMN IF EXISTS recurrence_rule;
ALTER TABLE events DROP COLUMN IF EXISTS is_recurring;
ALTER TABLE events DROP COLUMN IF EXISTS invite_scheduled_time;
ALTER TABLE events DROP COLUMN IF EXISTS invite_schedule;
ALTER TABLE events DROP COLUMN IF EXISTS decline_reason_mandatory;
ALTER TABLE events DROP COLUMN IF EXISTS requires_payment;
