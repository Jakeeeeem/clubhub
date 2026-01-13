/*
  Down Migration: Link documents to venues
*/

ALTER TABLE documents DROP COLUMN IF EXISTS venue_id;
