-- Add agree_terms and agree_third_party columns to users table
-- These are required by the registration flow

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS agree_terms BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS agree_third_party BOOLEAN DEFAULT false;
