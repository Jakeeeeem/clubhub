DROP TABLE IF EXISTS event_invitations;
DROP TABLE IF EXISTS tournament_teams;
DROP TABLE IF EXISTS scheduled_notifications;
ALTER TABLE events DROP COLUMN IF EXISTS status;
ALTER TABLE events DROP COLUMN IF EXISTS image_url;