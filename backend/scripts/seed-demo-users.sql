-- =====================================================
-- ClubHub Demo Users Seed Script
-- =====================================================
-- This script creates 4 demo accounts with real data
-- Run this in your PostgreSQL database
-- =====================================================

BEGIN;

-- 1. CREATE SUPER ADMIN
INSERT INTO users (email, password_hash, first_name, last_name, account_type, is_platform_admin, email_verified)
VALUES (
  'superadmin@clubhub.com',
  -- Password: Super@123 (bcrypt hash)
  '$2a$10$YourHashHere',  -- You'll need to generate this
  'Super',
  'Admin',
  'organization',
  true,
  true
)
ON CONFLICT (email) DO UPDATE 
SET is_platform_admin = true, updated_at = NOW();

-- 2. CREATE CLUB ADMIN USER
INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
VALUES (
  'admin@proclubdemo.com',
  -- Password: Admin@123
  '$2a$10$YourHashHere',
  'John',
  'Smith',
  'organization',
  true
)
ON CONFLICT (email) DO UPDATE 
SET account_type = 'organization', updated_at = NOW()
RETURNING id;

-- Get the admin user ID
DO $$
DECLARE
  admin_id UUID;
  club_id_var UUID;
  team_id_var UUID;
  coach_id UUID;
  player_user_id UUID;
  player_id_var UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_id FROM users WHERE email = 'admin@proclubdemo.com';
  
  -- 3. CREATE DEMO CLUB
  INSERT INTO clubs (
    name, sport, description, location, contact_email, 
    contact_phone, owner_id, member_count
  )
  VALUES (
    'Pro Club Demo',
    'Football',
    'Premier demo football club showcasing ClubHub features',
    'London, UK',
    'admin@proclubdemo.com',
    '+44 20 1234 5678',
    admin_id,
    25
  )
  ON CONFLICT (owner_id) DO UPDATE 
  SET name = 'Pro Club Demo', updated_at = NOW()
  RETURNING id INTO club_id_var;
  
  -- 4. CREATE DEMO TEAM
  INSERT INTO teams (name, age_group, club_id, sport)
  VALUES ('Under 18s', 'U18', club_id_var, 'Football')
  ON CONFLICT DO NOTHING
  RETURNING id INTO team_id_var;
  
  -- If team wasn't created (conflict), get existing one
  IF team_id_var IS NULL THEN
    SELECT id INTO team_id_var FROM teams WHERE club_id = club_id_var LIMIT 1;
  END IF;
  
  -- 5. CREATE COACH USER
  INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
  VALUES (
    'coach@proclubdemo.com',
    -- Password: Coach@123
    '$2a$10$YourHashHere',
    'Michael',
    'Thompson',
    'organization',
    true
  )
  ON CONFLICT (email) DO UPDATE 
  SET updated_at = NOW()
  RETURNING id INTO coach_id;
  
  -- Add coach to staff
  INSERT INTO staff (user_id, club_id, role, is_active)
  VALUES (coach_id, club_id_var, 'coach', true)
  ON CONFLICT (user_id, club_id) DO UPDATE 
  SET role = 'coach', is_active = true;
  
  -- Assign coach to team
  IF team_id_var IS NOT NULL THEN
    INSERT INTO team_coaches (team_id, coach_id)
    VALUES (team_id_var, coach_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- 6. CREATE PLAYER USER
  INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
  VALUES (
    'player@proclubdemo.com',
    -- Password: Player@123
    '$2a$10$YourHashHere',
    'David',
    'Williams',
    'adult',
    true
  )
  ON CONFLICT (email) DO UPDATE 
  SET updated_at = NOW()
  RETURNING id INTO player_user_id;
  
  -- Create player profile
  INSERT INTO user_profiles (user_id, date_of_birth, gender, location, sport, position, bio)
  VALUES (
    player_user_id,
    '2006-05-15',
    'Male',
    'London, UK',
    'Football',
    'Forward',
    'Passionate young footballer looking to develop skills and compete at the highest level.'
  )
  ON CONFLICT (user_id) DO UPDATE 
  SET sport = 'Football', position = 'Forward', updated_at = NOW();
  
  -- Add player to club
  INSERT INTO players (first_name, last_name, email, date_of_birth, position, club_id, user_id, monthly_fee)
  VALUES (
    'David',
    'Williams',
    'player@proclubdemo.com',
    '2006-05-15',
    'Forward',
    club_id_var,
    player_user_id,
    50.00
  )
  ON CONFLICT (email, club_id) DO UPDATE 
  SET user_id = player_user_id
  RETURNING id INTO player_id_var;
  
  -- Assign player to team
  IF team_id_var IS NOT NULL AND player_id_var IS NOT NULL THEN
    INSERT INTO team_players (team_id, player_id)
    VALUES (team_id_var, player_id_var)
    ON CONFLICT DO NOTHING;
  END IF;
  
END $$;

COMMIT;

-- =====================================================
-- DEMO LOGIN CREDENTIALS
-- =====================================================
-- Super Admin:     superadmin@clubhub.com / Super@123
-- Club Admin:      admin@proclubdemo.com / Admin@123
-- Coach:           coach@proclubdemo.com / Coach@123
-- Player:          player@proclubdemo.com / Player@123
-- =====================================================

SELECT 
  '✅ Demo users seeded successfully!' as status,
  'Check credentials in comments above' as note;
