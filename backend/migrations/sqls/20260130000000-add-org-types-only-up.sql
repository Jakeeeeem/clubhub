-- Minimal migration: add 'types' column to organizations only
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS types TEXT[];