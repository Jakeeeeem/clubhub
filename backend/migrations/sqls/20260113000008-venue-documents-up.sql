/*
  Up Migration: Link documents to venues
*/

ALTER TABLE documents ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE CASCADE;
