/*
  Down Migration: Add coordinates to events for geofencing
*/

ALTER TABLE events DROP COLUMN IF EXISTS latitude;
ALTER TABLE events DROP COLUMN IF EXISTS longitude;
