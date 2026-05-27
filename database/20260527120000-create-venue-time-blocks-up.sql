-- Migration: create venue_time_blocks and venue_opening_hours

CREATE TABLE IF NOT EXISTS venue_time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  days jsonb DEFAULT '[]'::jsonb,
  start_time time,
  end_time time,
  capacity integer,
  start_date date,
  end_date date,
  excluded_dates jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_time_blocks_venue_id ON venue_time_blocks(venue_id);

CREATE TABLE IF NOT EXISTS venue_opening_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  open_time time,
  close_time time,
  block_duration integer DEFAULT 60,
  block_type text DEFAULT 'fixed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_opening_hours_venue_id ON venue_opening_hours(venue_id);
