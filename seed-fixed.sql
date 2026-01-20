-- Non-transactional Fixed Seed
-- Password: Demo@123
-- Hash: $2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe

-- 1. CLEANUP ORGANIZATIONS/CLUBS FOR THIS USER
DELETE FROM team_players WHERE player_id IN (SELECT id FROM players WHERE user_id IN (SELECT id FROM users WHERE email = 'owner@demo.com'));
DELETE FROM players WHERE user_id IN (SELECT id FROM users WHERE email = 'owner@demo.com');
DELETE FROM team_players WHERE team_id IN (SELECT id FROM teams WHERE club_id IN (SELECT id FROM clubs WHERE owner_id IN (SELECT id FROM users WHERE email = 'owner@demo.com')));
DELETE FROM teams WHERE club_id IN (SELECT id FROM clubs WHERE owner_id IN (SELECT id FROM users WHERE email = 'owner@demo.com'));
DELETE FROM staff WHERE club_id IN (SELECT id FROM clubs WHERE owner_id IN (SELECT id FROM users WHERE email = 'owner@demo.com'));
DELETE FROM organization_members WHERE user_id IN (SELECT id FROM users WHERE email = 'owner@demo.com');
DELETE FROM clubs WHERE owner_id IN (SELECT id FROM users WHERE email = 'owner@demo.com');
DELETE FROM organizations WHERE owner_id IN (SELECT id FROM users WHERE email = 'owner@demo.com');

-- 2. CREATE USERS
INSERT INTO users (email, password_hash, first_name, last_name, account_type)
VALUES ('owner@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'John', 'Smith', 'organization')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 3. CREATE ORGANIZATION & CLUB
INSERT INTO organizations (name, slug, sport, description, location, owner_id)
SELECT 'Elite Youth Academy', 'elite-youth-academy', 'Football', 'Premier youth academy for future stars', 'London, UK', id
FROM users WHERE email = 'owner@demo.com'
ON CONFLICT DO NOTHING;

INSERT INTO clubs (name, sport, description, location, owner_id, member_count, types)
SELECT 'Elite Youth Academy', 'Football', 'Premier youth academy for future stars', 'London, UK', id, 25, ARRAY['club']
FROM users WHERE email = 'owner@demo.com'
ON CONFLICT DO NOTHING;

-- 4. LINK USER TO ORGANIZATION
INSERT INTO organization_members (organization_id, user_id, role, status)
SELECT o.id, u.id, 'owner', 'active'
FROM organizations o, users u 
WHERE o.name = 'Elite Youth Academy' AND u.email = 'owner@demo.com'
ON CONFLICT DO NOTHING;

-- 5. SET PREFERENCES (Current Org)
DELETE FROM user_preferences WHERE user_id IN (SELECT id FROM users WHERE email = 'owner@demo.com');
INSERT INTO user_preferences (user_id, current_organization_id)
SELECT u.id, o.id
FROM users u, organizations o
WHERE u.email = 'owner@demo.com' AND o.name = 'Elite Youth Academy';

-- 6. CREATE TEAMS
INSERT INTO teams (name, age_group, sport, club_id)
SELECT 'Under 12s', 'U12', 'Football', c.id FROM clubs c WHERE c.name = 'Elite Youth Academy';

-- 7. CREATE PLAYERS
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee)
SELECT 'Oliver', 'Smith', '2012-03-15', 'Forward', u.id, c.id, 'Football', 'Male', 'London, UK', 'paid', 50.00
FROM users u, clubs c WHERE u.email = 'owner@demo.com' AND c.name = 'Elite Youth Academy';

-- 8. TEAM ASSIGNMENTS
INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 10
FROM teams t, players p 
WHERE t.name = 'Under 12s' AND p.first_name = 'Oliver'
ON CONFLICT DO NOTHING;
