-- Change player defaults to avoid hardcoded mock values for new players
ALTER TABLE players 
ALTER COLUMN attendance_rate SET DEFAULT 0;

-- Update existing players who have the default 85 to 0 if they have no ratings or bookings
-- (Optional, but let's at least fix the default for new ones)
UPDATE players SET attendance_rate = 0 WHERE attendance_rate = 85;