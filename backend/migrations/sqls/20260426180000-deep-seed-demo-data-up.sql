-- Deep Seed Demo Data for Admin
-- Associate all data with admin@clubhub.com

DO $$ 
DECLARE 
    admin_id UUID;
    club_id UUID;
    team_1_id UUID := '11111111-1111-4111-a111-111111111111';
    team_2_id UUID := '22222222-2222-4222-a222-222222222222';
    team_3_id UUID := '33333333-3333-4333-a333-333333333333';
    staff_1_id UUID := '55555555-5555-4555-a555-555555555555';
BEGIN
    -- 1. Ensure Admin User exists
    SELECT id INTO admin_id FROM users WHERE email = 'admin@clubhub.com';
    
    IF admin_id IS NULL THEN
        INSERT INTO users (email, password_hash, first_name, last_name, account_type, is_active)
        VALUES (
            'admin@clubhub.com', 
            '$2b$12$KPhM6XW/W9O.wVvH9A4XyO0Z6Xo9S6W6S6W6S6W6S6W6S6W6S6W6S', 
            'Demo', 
            'Admin', 
            'organization', 
            true
        ) RETURNING id INTO admin_id;
    END IF;

    -- 2. Ensure Club exists
    SELECT id INTO club_id FROM clubs WHERE owner_id = admin_id LIMIT 1;
    
    IF club_id IS NULL THEN
        INSERT INTO clubs (owner_id, name, location, sport, description, types, created_at)
        VALUES (
            admin_id, 
            'ClubHub United Academy', 
            'London, UK', 
            'Football', 
            'Premier professional academy showcasing elite development pathways.',
            ARRAY['club', 'academy'],
            NOW()
        ) RETURNING id INTO club_id;
    END IF;

    -- Update user's current context
    UPDATE users SET current_organization_id = club_id WHERE id = admin_id AND current_organization_id IS NULL;

    -- 3. Create Teams (Using id check)
    IF NOT EXISTS (SELECT 1 FROM teams WHERE id = team_1_id) THEN
        INSERT INTO teams (id, club_id, name, age_group, sport, created_at)
        VALUES (team_1_id, club_id, 'Under 16s Squad', 'U16', 'Football', NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM teams WHERE id = team_2_id) THEN
        INSERT INTO teams (id, club_id, name, age_group, sport, created_at)
        VALUES (team_2_id, club_id, 'Under 12s Academy', 'U12', 'Football', NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM teams WHERE id = team_3_id) THEN
        INSERT INTO teams (id, club_id, name, age_group, sport, created_at)
        VALUES (team_3_id, club_id, 'First Team', 'Senior', 'Football', NOW());
    END IF;

    -- 4. Create Staff
    IF NOT EXISTS (SELECT 1 FROM staff WHERE id = staff_1_id) THEN
        INSERT INTO staff (id, club_id, first_name, last_name, role, email, created_at)
        VALUES (staff_1_id, club_id, 'Alex', 'Morgan', 'coach', 'alex.m@demo.clubhub.com', NOW());
    END IF;

    -- Link Staff 1 to Team 2
    UPDATE teams SET coach_id = staff_1_id WHERE id = team_2_id AND coach_id IS NULL;

    -- 5. Create Players (Using email check)
    IF NOT EXISTS (SELECT 1 FROM players WHERE email = 'marcus.t@demo.com') THEN
        INSERT INTO players (first_name, last_name, email, club_id, date_of_birth, position, payment_status, created_at)
        VALUES ('Marcus', 'Thompson', 'marcus.t@demo.com', club_id, '2008-05-15', 'Forward', 'paid', NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM players WHERE email = 'leo.m@demo.com') THEN
        INSERT INTO players (first_name, last_name, email, club_id, date_of_birth, position, payment_status, created_at)
        VALUES ('Leo', 'Messi', 'leo.m@demo.com', club_id, '1987-06-24', 'Forward', 'paid', NOW());
    END IF;

    -- 6. Create Events
    IF NOT EXISTS (SELECT 1 FROM events WHERE club_id = club_id AND title = 'Summer Talent ID Camp') THEN
        INSERT INTO events (club_id, title, event_date, event_time, location, event_type, team_id, description, created_by, created_at)
        VALUES (club_id, 'Summer Talent ID Camp', CURRENT_DATE + INTERVAL '7 days', '09:00', 'Main Stadium', 'camp', NULL, 'Flagship camp.', admin_id, NOW());
    END IF;

    -- 7. Create Tournaments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournaments') THEN
        IF NOT EXISTS (SELECT 1 FROM tournaments WHERE club_id = club_id AND name = 'Elite Academy Premier League') THEN
            INSERT INTO tournaments (club_id, name, start_date, status, created_at)
            VALUES (club_id, 'Elite Academy Premier League', CURRENT_DATE - INTERVAL '5 days', 'active', NOW());
        END IF;
    END IF;

END $$;
