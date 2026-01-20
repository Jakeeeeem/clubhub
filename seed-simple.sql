-- Simple seed that matches actual database schema
-- Password: Demo@123
-- Hash: $2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe

-- Create users (without email_verified column)
INSERT INTO users (email, password_hash, first_name, last_name, account_type)
VALUES ('owner@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'John', 'Smith', 'organization')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO users (email, password_hash, first_name, last_name, account_type)
VALUES ('player@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'Mike', 'Brown', 'organization')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO users (email, password_hash, first_name, last_name, account_type)
VALUES ('noclub@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'Sarah', 'Jones', 'organization')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Create club (without contact_email column)
INSERT INTO clubs (name, sport, description, location, owner_id, member_count, types)
SELECT 'Elite Youth Academy', 'Football', 'Premier youth academy', 'London, UK', id, 0, ARRAY['club']
FROM users WHERE email = 'owner@demo.com'
ON CONFLICT (owner_id) DO UPDATE SET name = EXCLUDED.name;

-- Create teams
INSERT INTO teams (name, age_group, sport, club_id)
SELECT 'Under 12s', 'U12', 'Football', c.id FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO teams (name, age_group, sport, club_id)
SELECT 'Under 14s', 'U14', 'Football', c.id FROM clubs c WHERE c.name = 'Elite Youth Academy';

-- Create players
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee)
SELECT 'Oliver', 'Smith', '2012-03-15', 'Forward', u.id, c.id, 'Football', 'Male', 'London, UK', 'paid', 50.00
FROM users u, clubs c WHERE u.email = 'owner@demo.com' AND c.name = 'Elite Youth Academy';

INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee)
SELECT 'Emma', 'Smith', '2014-07-22', 'Midfielder', u.id, c.id, 'Football', 'Female', 'London, UK', 'pending', 50.00
FROM users u, clubs c WHERE u.email = 'owner@demo.com' AND c.name = 'Elite Youth Academy';

INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee)
SELECT 'Noah', 'Brown', '2010-11-08', 'Defender', u.id, c.id, 'Football', 'Male', 'London, UK', 'paid', 50.00
FROM users u, clubs c WHERE u.email = 'player@demo.com' AND c.name = 'Elite Youth Academy';

-- Assign to teams
INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, 'Forward', 10
FROM teams t, players p WHERE t.name = 'Under 12s' AND p.first_name = 'Oliver';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, 'Midfielder', 8
FROM teams t, players p WHERE t.name = 'Under 14s' AND p.first_name = 'Emma';

-- Create events
INSERT INTO events (title, description, event_type, event_date, event_time, location, price, club_id, team_id, created_by)
SELECT 'Weekly Training', 'U12s training', 'training', CURRENT_DATE + 7, '18:00', 'Main Pitch', 0, c.id, t.id, u.id
FROM clubs c, teams t, users u WHERE c.name = 'Elite Youth Academy' AND t.name = 'Under 12s' AND u.email = 'owner@demo.com';

-- Update club count
UPDATE clubs SET member_count = 3 WHERE name = 'Elite Youth Academy';
