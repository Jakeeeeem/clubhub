-- ============================================================
-- CLUBHUB COMPLETE SEED - FULL REALISTIC DATA
-- ============================================================
-- Password for ALL accounts: Demo@123
-- Hash: $2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe

-- ============================================================
-- 1. CREATE USERS (All account_type='organization')
-- ============================================================

-- Club Owner (has club + children)
INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
VALUES ('owner@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'John', 'Smith', 'organization', true);

-- User with no club yet
INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
VALUES ('noclub@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'Sarah', 'Jones', 'organization', true);

-- Player invited (has child in club, no own club)
INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
VALUES ('player@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'Mike', 'Brown', 'organization', true);

-- Coach user
INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
VALUES ('coach@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'Tom', 'Wilson', 'organization', true);

-- More parent users (for dummy players)
INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
VALUES 
('parent1@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'David', 'Taylor', 'organization', true),
('parent2@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'Emma', 'Davis', 'organization', true),
('parent3@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'James', 'Miller', 'organization', true),
('parent4@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'Lisa', 'Wilson', 'organization', true),
('parent5@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'Robert', 'Moore', 'organization', true);

-- ============================================================
-- 2. CREATE CLUB
-- ============================================================

INSERT INTO clubs (name, sport, description, location, contact_email, owner_id, member_count, types, established, website, philosophy)
SELECT 
    'Elite Youth Academy',
    'Football',
    'Premier youth football academy developing future stars through excellence in coaching and player development',
    'London, UK',
    'owner@demo.com',
    id,
    0,
    ARRAY['club'],
    '2015',
    'www.eliteyouthacademy.com',
    'Excellence through dedication, teamwork, and continuous improvement'
FROM users WHERE email = 'owner@demo.com';

-- ============================================================
-- 3. CREATE TEAMS
-- ============================================================

INSERT INTO teams (name, age_group, sport, club_id, description, wins, losses, draws)
SELECT 'Under 10s', 'U10', 'Football', c.id, 'Foundation development squad', 5, 2, 1 FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO teams (name, age_group, sport, club_id, description, wins, losses, draws)
SELECT 'Under 12s', 'U12', 'Football', c.id, 'Development squad building core skills', 8, 3, 2 FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO teams (name, age_group, sport, club_id, description, wins, losses, draws)
SELECT 'Under 14s', 'U14', 'Football', c.id, 'Competitive squad for league play', 12, 4, 3 FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO teams (name, age_group, sport, club_id, description, wins, losses, draws)
SELECT 'Under 16s', 'U16', 'Football', c.id, 'Elite squad preparing for senior football', 15, 2, 1 FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO teams (name, age_group, sport, club_id, description, wins, losses, draws)
SELECT 'Under 18s', 'U18', 'Football', c.id, 'Premier youth squad', 10, 5, 3 FROM clubs c WHERE c.name = 'Elite Youth Academy';

-- ============================================================
-- 4. CREATE STAFF (Coaches for teams)
-- ============================================================

INSERT INTO staff (user_id, first_name, last_name, email, role, club_id, permissions)
SELECT u.id, 'Tom', 'Wilson', 'coach@demo.com', 'coach', c.id, ARRAY['players', 'events', 'teams']
FROM users u, clubs c WHERE u.email = 'coach@demo.com' AND c.name = 'Elite Youth Academy';

INSERT INTO staff (first_name, last_name, email, role, club_id, permissions)
SELECT 'Mark', 'Johnson', 'mark.j@academy.com', 'coach', c.id, ARRAY['players', 'events']
FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO staff (first_name, last_name, email, role, club_id, permissions)
SELECT 'Sarah', 'Anderson', 'sarah.a@academy.com', 'assistant-coach', c.id, ARRAY['players']
FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO staff (first_name, last_name, email, role, club_id, permissions)
SELECT 'Peter', 'Roberts', 'peter.r@academy.com', 'coach', c.id, ARRAY['players', 'events', 'teams']
FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO staff (first_name, last_name, email, role, club_id, permissions)
SELECT 'Linda', 'White', 'linda.w@academy.com', 'treasurer', c.id, ARRAY['finances', 'payments']
FROM clubs c WHERE c.name = 'Elite Youth Academy';

-- Assign coaches to teams
UPDATE teams SET coach_id = (SELECT id FROM staff WHERE email = 'coach@demo.com') WHERE name = 'Under 12s';
UPDATE teams SET coach_id = (SELECT id FROM staff WHERE email = 'mark.j@academy.com') WHERE name = 'Under 14s';
UPDATE teams SET coach_id = (SELECT id FROM staff WHERE email = 'peter.r@academy.com') WHERE name = 'Under 16s';

-- ============================================================
-- 5. CREATE PLAYERS (Owner's children + invited player + LOTS of dummy players)
-- ============================================================

-- Owner's children
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate)
SELECT 'Oliver', 'Smith', '2012-03-15', 'Forward', u.id, c.id, 'Football', 'Male', 'London, UK', 'paid', 50.00, 95
FROM users u, clubs c WHERE u.email = 'owner@demo.com' AND c.name = 'Elite Youth Academy';

INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate)
SELECT 'Emma', 'Smith', '2014-07-22', 'Midfielder', u.id, c.id, 'Football', 'Female', 'London, UK', 'pending', 50.00, 88
FROM users u, clubs c WHERE u.email = 'owner@demo.com' AND c.name = 'Elite Youth Academy';

-- Invited player's child
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate)
SELECT 'Noah', 'Brown', '2010-11-08', 'Defender', u.id, c.id, 'Football', 'Male', 'London, UK', 'paid', 50.00, 92
FROM users u, clubs c WHERE u.email = 'player@demo.com' AND c.name = 'Elite Youth Academy';

-- DUMMY PLAYERS (Parent 1's kids)
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate)
SELECT 'Liam', 'Taylor', '2014-01-20', 'Goalkeeper', u.id, c.id, 'Football', 'Male', 'London, UK', 'paid', 50.00, 90
FROM users u, clubs c WHERE u.email = 'parent1@demo.com' AND c.name = 'Elite Youth Academy';

INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate)
SELECT 'Sophie', 'Taylor', '2012-05-12', 'Midfielder', u.id, c.id, 'Football', 'Female', 'London, UK', 'paid', 50.00, 87
FROM users u, clubs c WHERE u.email = 'parent1@demo.com' AND c.name = 'Elite Youth Academy';

-- Parent 2's kids
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate)
SELECT 'Jack', 'Davis', '2013-09-08', 'Forward', u.id, c.id, 'Football', 'Male', 'London, UK', 'pending', 50.00, 85
FROM users u, clubs c WHERE u.email = 'parent2@demo.com' AND c.name = 'Elite Youth Academy';

INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate)
SELECT 'Mia', 'Davis', '2015-03-25', 'Defender', u.id, c.id, 'Football', 'Female', 'London, UK', 'paid', 50.00, 93
FROM users u, clubs c WHERE u.email = 'parent2@demo.com' AND c.name = 'Elite Youth Academy';

-- Parent 3's kids
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate)
SELECT 'Lucas', 'Miller', '2011-11-30', 'Midfielder', u.id, c.id, 'Football', 'Male', 'London, UK', 'paid', 50.00, 91
FROM users u, clubs c WHERE u.email = 'parent3@demo.com' AND c.name = 'Elite Youth Academy';

INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate)
SELECT 'Ava', 'Miller', '2016-07-14', 'Forward', u.id, c.id, 'Football', 'Female', 'London, UK', 'overdue', 50.00, 78
FROM users u, clubs c WHERE u.email = 'parent3@demo.com' AND c.name = 'Elite Youth Academy';

-- Parent 4's kids
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate)
SELECT 'Ethan', 'Wilson', '2012-02-18', 'Defender', u.id, c.id, 'Football', 'Male', 'London, UK', 'paid', 50.00, 94
FROM users u, clubs c WHERE u.email = 'parent4@demo.com' AND c.name = 'Elite Youth Academy';

INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate)
SELECT 'Isabella', 'Wilson', '2014-08-22', 'Midfielder', u.id, c.id, 'Football', 'Female', 'London, UK', 'paid', 50.00, 89
FROM users u, clubs c WHERE u.email = 'parent4@demo.com' AND c.name = 'Elite Youth Academy';

-- Parent 5's kids
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate)
SELECT 'Mason', 'Moore', '2013-12-05', 'Forward', u.id, c.id, 'Football', 'Male', 'London, UK', 'pending', 50.00, 86
FROM users u, clubs c WHERE u.email = 'parent5@demo.com' AND c.name = 'Elite Youth Academy';

INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate)
SELECT 'Charlotte', 'Moore', '2015-04-17', 'Goalkeeper', u.id, c.id, 'Football', 'Female', 'London, UK', 'paid', 50.00, 92
FROM users u, clubs c WHERE u.email = 'parent5@demo.com' AND c.name = 'Elite Youth Academy';

-- More standalone players (no parent user)
INSERT INTO players (first_name, last_name, date_of_birth, position, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate, email)
SELECT 'Ben', 'Harris', '2012-06-10', 'Midfielder', c.id, 'Football', 'Male', 'London, UK', 'paid', 50.00, 88, 'ben.harris@email.com'
FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO players (first_name, last_name, date_of_birth, position, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate, email)
SELECT 'Amelia', 'Clark', '2014-10-03', 'Forward', c.id, 'Football', 'Female', 'London, UK', 'paid', 50.00, 90, 'amelia.clark@email.com'
FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO players (first_name, last_name, date_of_birth, position, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate, email)
SELECT 'Daniel', 'Lewis', '2011-03-28', 'Defender', c.id, 'Football', 'Male', 'London, UK', 'pending', 50.00, 84, 'daniel.lewis@email.com'
FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO players (first_name, last_name, date_of_birth, position, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate, email)
SELECT 'Grace', 'Walker', '2013-07-19', 'Midfielder', c.id, 'Football', 'Female', 'London, UK', 'paid', 50.00, 91, 'grace.walker@email.com'
FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO players (first_name, last_name, date_of_birth, position, club_id, sport, gender, location, payment_status, monthly_fee, attendance_rate, email)
SELECT 'Henry', 'Hall', '2015-01-11', 'Forward', c.id, 'Football', 'Male', 'London, UK', 'paid', 50.00, 87, 'henry.hall@email.com'
FROM clubs c WHERE c.name = 'Elite Youth Academy';

-- ============================================================
-- 6. ASSIGN ALL PLAYERS TO TEAMS
-- ============================================================

-- U10s Team
INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 1 FROM teams t, players p WHERE t.name = 'Under 10s' AND p.first_name = 'Ava';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 7 FROM teams t, players p WHERE t.name = 'Under 10s' AND p.first_name = 'Henry';

-- U12s Team
INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 10 FROM teams t, players p WHERE t.name = 'Under 12s' AND p.first_name = 'Oliver';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 5 FROM teams t, players p WHERE t.name = 'Under 12s' AND p.first_name = 'Sophie';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 3 FROM teams t, players p WHERE t.name = 'Under 12s' AND p.first_name = 'Ethan';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 8 FROM teams t, players p WHERE t.name = 'Under 12s' AND p.first_name = 'Ben';

-- U14s Team
INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 8 FROM teams t, players p WHERE t.name = 'Under 14s' AND p.first_name = 'Emma';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 1 FROM teams t, players p WHERE t.name = 'Under 14s' AND p.first_name = 'Liam';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 9 FROM teams t, players p WHERE t.name = 'Under 14s' AND p.first_name = 'Jack';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 4 FROM teams t, players p WHERE t.name = 'Under 14s' AND p.first_name = 'Mia';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 11 FROM teams t, players p WHERE t.name = 'Under 14s' AND p.first_name = 'Isabella';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 7 FROM teams t, players p WHERE t.name = 'Under 14s' AND p.first_name = 'Amelia';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 6 FROM teams t, players p WHERE t.name = 'Under 14s' AND p.first_name = 'Grace';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 10 FROM teams t, players p WHERE t.name = 'Under 14s' AND p.first_name = 'Mason';

-- U16s Team
INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 5 FROM teams t, players p WHERE t.name = 'Under 16s' AND p.first_name = 'Noah';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 8 FROM teams t, players p WHERE t.name = 'Under 16s' AND p.first_name = 'Lucas';

INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 3 FROM teams t, players p WHERE t.name = 'Under 16s' AND p.first_name = 'Daniel';

-- U18s Team
INSERT INTO team_players (team_id, player_id, position, jersey_number)
SELECT t.id, p.id, p.position, 1 FROM teams t, players p WHERE t.name = 'Under 18s' AND p.first_name = 'Charlotte';

-- ============================================================
-- 7. CREATE EVENTS (Training, Matches, Camps, Talent ID)
-- ============================================================

-- Training sessions
INSERT INTO events (title, description, event_type, event_date, event_time, location, price, club_id, team_id, created_by)
SELECT 'U12s Weekly Training', 'Regular Tuesday training', 'training', CURRENT_DATE + 2, '18:00', 'Main Pitch', 0, c.id, t.id, u.id
FROM clubs c, teams t, users u WHERE c.name = 'Elite Youth Academy' AND t.name = 'Under 12s' AND u.email = 'owner@demo.com';

INSERT INTO events (title, description, event_type, event_date, event_time, location, price, club_id, team_id, created_by)
SELECT 'U14s Training Session', 'Thursday training', 'training', CURRENT_DATE + 4, '18:30', 'Field B', 0, c.id, t.id, u.id
FROM clubs c, teams t, users u WHERE c.name = 'Elite Youth Academy' AND t.name = 'Under 14s' AND u.email = 'owner@demo.com';

INSERT INTO events (title, description, event_type, event_date, event_time, location, price, club_id, team_id, created_by)
SELECT 'U16s Training', 'Advanced training session', 'training', CURRENT_DATE + 3, '19:00', 'Stadium Pitch', 0, c.id, t.id, u.id
FROM clubs c, teams t, users u WHERE c.name = 'Elite Youth Academy' AND t.name = 'Under 16s' AND u.email = 'owner@demo.com';

-- Matches
INSERT INTO events (title, description, event_type, event_date, event_time, location, price, club_id, team_id, opponent, created_by)
SELECT 'U14s League Match', 'Home game', 'match', CURRENT_DATE + 7, '14:00', 'Stadium', 0, c.id, t.id, 'City Rovers U14s', u.id
FROM clubs c, teams t, users u WHERE c.name = 'Elite Youth Academy' AND t.name = 'Under 14s' AND u.email = 'owner@demo.com';

INSERT INTO events (title, description, event_type, event_date, event_time, location, price, club_id, team_id, opponent, created_by)
SELECT 'U16s Cup Match', 'Quarter final', 'match', CURRENT_DATE + 14, '15:00', 'Stadium', 0, c.id, t.id, 'United FC U16s', u.id
FROM clubs c, teams t, users u WHERE c.name = 'Elite Youth Academy' AND t.name = 'Under 16s' AND u.email = 'owner@demo.com';

INSERT INTO events (title, description, event_type, event_date, event_time, location, price, club_id, team_id, opponent, created_by)
SELECT 'U12s Friendly', 'Practice match', 'match', CURRENT_DATE + 10, '11:00', 'Training Ground', 0, c.id, t.id, 'Rangers U12s', u.id
FROM clubs c, teams t, users u WHERE c.name = 'Elite Youth Academy' AND t.name = 'Under 12s' AND u.email = 'owner@demo.com';

-- Paid events
INSERT INTO events (title, description, event_type, event_date, event_time, location, price, capacity, spots_available, club_id, created_by)
SELECT 'Summer Skills Camp', 'Intensive 3-day camp', 'camp', CURRENT_DATE + 45, '09:00', 'Training Ground', 75.00, 30, 25, c.id, u.id
FROM clubs c, users u WHERE c.name = 'Elite Youth Academy' AND u.email = 'owner@demo.com';

INSERT INTO events (title, description, event_type, event_date, event_time, location, price, capacity, spots_available, club_id, created_by)
SELECT 'Talent ID Day', 'Open trial for new players', 'talent-id', CURRENT_DATE + 21, '10:00', 'Stadium', 25.00, 50, 42, c.id, u.id
FROM clubs c, users u WHERE c.name = 'Elite Youth Academy' AND u.email = 'owner@demo.com';

INSERT INTO events (title, description, event_type, event_date, event_time, location, price, capacity, spots_available, club_id, created_by)
SELECT 'Easter Tournament', '2-day tournament', 'tournament', CURRENT_DATE + 60, '08:00', 'Regional Sports Complex', 40.00, 40, 35, c.id, u.id
FROM clubs c, users u WHERE c.name = 'Elite Youth Academy' AND u.email = 'owner@demo.com';

INSERT INTO events (title, description, event_type, event_date, event_time, location, price, club_id, created_by)
SELECT 'End of Season Social', 'Awards ceremony and BBQ', 'social', CURRENT_DATE + 90, '17:00', 'Clubhouse', 10.00, c.id, u.id
FROM clubs c, users u WHERE c.name = 'Elite Youth Academy' AND u.email = 'owner@demo.com';

-- ============================================================
-- 8. CREATE BOOKINGS
-- ============================================================

INSERT INTO event_bookings (event_id, user_id, player_id, booking_status, payment_status, amount_paid)
SELECT e.id, u.id, p.id, 'confirmed', 'paid', 75.00
FROM events e, users u, players p
WHERE e.title = 'Summer Skills Camp' AND u.email = 'owner@demo.com' AND p.first_name = 'Oliver';

INSERT INTO event_bookings (event_id, user_id, player_id, booking_status, payment_status, amount_paid)
SELECT e.id, u.id, p.id, 'pending', 'pending', 0
FROM events e, users u, players p
WHERE e.title = 'Summer Skills Camp' AND u.email = 'player@demo.com' AND p.first_name = 'Noah';

INSERT INTO event_bookings (event_id, user_id, player_id, booking_status, payment_status, amount_paid)
SELECT e.id, u.id, p.id, 'confirmed', 'paid', 25.00
FROM events e, users u, players p
WHERE e.title = 'Talent ID Day' AND u.email = 'parent1@demo.com' AND p.first_name = 'Sophie';

INSERT INTO event_bookings (event_id, user_id, player_id, booking_status, payment_status, amount_paid)
SELECT e.id, u.id, p.id, 'confirmed', 'paid', 40.00
FROM events e, users u, players p
WHERE e.title = 'Easter Tournament' AND u.email = 'parent2@demo.com' AND p.first_name = 'Jack';

-- ============================================================
-- 9. CREATE PAYMENTS
-- ============================================================

-- Monthly fees
INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status, paid_date)
SELECT p.id, c.id, 50.00, 'monthly_fee', 'January 2026', CURRENT_DATE - 5, 'paid', CURRENT_DATE - 3
FROM players p, clubs c WHERE p.first_name = 'Oliver' AND c.name = 'Elite Youth Academy';

INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status)
SELECT p.id, c.id, 50.00, 'monthly_fee', 'January 2026', CURRENT_DATE + 5, 'pending'
FROM players p, clubs c WHERE p.first_name = 'Emma' AND c.name = 'Elite Youth Academy';

INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status, paid_date)
SELECT p.id, c.id, 50.00, 'monthly_fee', 'January 2026', CURRENT_DATE - 10, 'paid', CURRENT_DATE - 8
FROM players p, clubs c WHERE p.first_name = 'Noah' AND c.name = 'Elite Youth Academy';

INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status, paid_date)
SELECT p.id, c.id, 50.00, 'monthly_fee', 'January 2026', CURRENT_DATE - 7, 'paid', CURRENT_DATE - 5
FROM players p, clubs c WHERE p.first_name = 'Sophie' AND c.name = 'Elite Youth Academy';

INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status)
SELECT p.id, c.id, 50.00, 'monthly_fee', 'January 2026', CURRENT_DATE + 3, 'pending'
FROM players p, clubs c WHERE p.first_name = 'Jack' AND c.name = 'Elite Youth Academy';

INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status)
SELECT p.id, c.id, 50.00, 'monthly_fee', 'January 2026', CURRENT_DATE - 2, 'overdue'
FROM players p, clubs c WHERE p.first_name = 'Ava' AND c.name = 'Elite Youth Academy';

-- Event payments
INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status, paid_date)
SELECT p.id, c.id, 75.00, 'event_booking', 'Summer Camp', CURRENT_DATE - 2, 'paid', CURRENT_DATE - 1
FROM players p, clubs c WHERE p.first_name = 'Oliver' AND c.name = 'Elite Youth Academy';

INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status, paid_date)
SELECT p.id, c.id, 25.00, 'event_booking', 'Talent ID Day', CURRENT_DATE - 1, 'paid', CURRENT_DATE
FROM players p, clubs c WHERE p.first_name = 'Sophie' AND c.name = 'Elite Youth Academy';

INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status, paid_date)
SELECT p.id, c.id, 40.00, 'event_booking', 'Easter Tournament', CURRENT_DATE - 3, 'paid', CURRENT_DATE - 2
FROM players p, clubs c WHERE p.first_name = 'Jack' AND c.name = 'Elite Youth Academy';

-- ============================================================
-- 10. CREATE RECRUITMENT LISTINGS
-- ============================================================

INSERT INTO listings (club_id, title, description, positions, age_group, status)
SELECT c.id, 'U12 Striker Needed', 'Elite Youth Academy seeking talented striker for U12s squad. Must be committed and passionate.', ARRAY['Forward', 'Striker'], 'U12', 'active'
FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO listings (club_id, title, description, positions, age_group, status)
SELECT c.id, 'U14 Central Midfielder', 'Looking for creative midfielder with excellent passing ability for competitive U14s team.', ARRAY['Midfielder', 'Central Midfielder'], 'U14', 'active'
FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO listings (club_id, title, description, positions, age_group, status)
SELECT c.id, 'U16 Centre Back Required', 'Elite U16s squad needs strong, commanding centre back. Previous competitive experience preferred.', ARRAY['Defender', 'Centre Back'], 'U16', 'active'
FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO listings (club_id, title, description, positions, age_group, status)
SELECT c.id, 'U10 Goalkeeper Wanted', 'Foundation squad looking for dedicated goalkeeper to develop with the team.', ARRAY['Goalkeeper'], 'U10', 'active'
FROM clubs c WHERE c.name = 'Elite Youth Academy';

INSERT INTO listings (club_id, title, description, positions, age_group, status)
SELECT c.id, 'U18 Winger Position', 'Premier youth squad seeking fast, skillful winger for upcoming season.', ARRAY['Forward', 'Winger'], 'U18', 'active'
FROM clubs c WHERE c.name = 'Elite Youth Academy';

-- ============================================================
-- 11. UPDATE CLUB MEMBER COUNT
-- ============================================================

UPDATE clubs SET member_count = (SELECT COUNT(*) FROM players WHERE club_id = clubs.id) WHERE name = 'Elite Youth Academy';
