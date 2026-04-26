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
    -- 1. Ensure Admin User exists and get ID
    INSERT INTO users (email, password_hash, first_name, last_name, account_type, is_active)
    VALUES (
        'admin@clubhub.com', 
        '$2b$12$KPhM6XW/W9O.wVvH9A4XyO0Z6Xo9S6W6S6W6S6W6S6W6S6W6S6W6S', -- 'password123'
        'Demo', 
        'Admin', 
        'organization', 
        true
    ) ON CONFLICT (email) DO UPDATE SET is_active = true, account_type = 'organization'
    RETURNING id INTO admin_id;

    -- 2. Create Club
    INSERT INTO clubs (owner_id, name, location, sport, description, types, created_at)
    VALUES (
        admin_id, 
        'ClubHub United Academy', 
        'London, UK', 
        'Football', 
        'Premier professional academy showcasing elite development pathways.',
        ARRAY['club', 'academy'],
        NOW()
    ) ON CONFLICT (owner_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO club_id;

    -- 3. Create Teams
    INSERT INTO teams (id, club_id, name, age_group, sport, created_at)
    VALUES 
        (team_1_id, club_id, 'Under 16s Squad', 'U16', 'Football', NOW()),
        (team_2_id, club_id, 'Under 12s Academy', 'U12', 'Football', NOW()),
        (team_3_id, club_id, 'First Team', 'Senior', 'Football', NOW())
    ON CONFLICT (id) DO NOTHING;

    -- 4. Create Staff (Coaches)
    INSERT INTO staff (id, club_id, first_name, last_name, role, email, created_at)
    VALUES 
        (staff_1_id, club_id, 'Alex', 'Morgan', 'coach', 'alex.m@demo.clubhub.com', NOW()),
        ('66666666-6666-4666-a666-666666666666', club_id, 'Sam', 'Riley', 'coach', 'sam.r@demo.clubhub.com', NOW()),
        ('77777777-7777-4777-a777-777777777777', club_id, 'David', 'Webb', 'administrator', 'david.w@demo.clubhub.com', NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Link Staff 1 to Team 2
    UPDATE teams SET coach_id = staff_1_id WHERE id = team_2_id;

    -- 5. Create Players
    INSERT INTO players (first_name, last_name, email, club_id, date_of_birth, position, payment_status, created_at)
    VALUES 
        ('Marcus', 'Thompson', 'marcus.t@demo.com', club_id, '2008-05-15', 'Forward', 'paid', NOW()),
        ('Liam', 'Brown', 'liam.b@demo.com', club_id, '2008-06-20', 'Midfielder', 'paid', NOW()),
        ('David', 'Williams', 'david.w@demo.com', club_id, '2012-03-10', 'Goalkeeper', 'paid', NOW()),
        ('Jordan', 'Smith', 'jordan.s@demo.com', club_id, '2012-08-12', 'Defender', 'pending', NOW()),
        ('Leo', 'Messi', 'leo.m@demo.com', club_id, '1987-06-24', 'Forward', 'paid', NOW()),
        ('Sarah', 'Davies', 'sarah.d@demo.com', club_id, '2012-01-05', 'Midfielder', 'paid', NOW()),
        ('Jack', 'Grealish', 'jack.g@demo.com', club_id, '1995-09-10', 'Winger', 'paid', NOW()),
        ('Harry', 'Kane', 'harry.k@demo.com', club_id, '1993-07-28', 'Striker', 'paid', NOW())
    ON CONFLICT (email) DO NOTHING;

    -- 6. Create Events
    INSERT INTO events (club_id, title, event_date, event_time, location, event_type, team_id, description, created_by, created_at)
    VALUES 
        (club_id, 'Summer Talent ID Camp', CURRENT_DATE + INTERVAL '7 days', '09:00', 'Main Stadium', 'camp', NULL, 'Flagship talent ID camp.', admin_id, NOW()),
        (club_id, 'Elite Training Session', CURRENT_DATE + INTERVAL '2 days', '18:30', 'Field A', 'training', team_1_id, 'U16 Technical training.', admin_id, NOW()),
        (club_id, 'First Team Match Day', CURRENT_DATE + INTERVAL '4 days', '14:00', 'Home Stadium', 'match', team_3_id, 'League match vs rivals.', admin_id, NOW())
    ON CONFLICT DO NOTHING;

    -- 7. Create Tournaments
    -- Note: Tournament schema might be separate table, but usually they are events of type 'tournament'
    -- If there's a separate 'tournaments' table, we use it too
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournaments') THEN
        INSERT INTO tournaments (club_id, name, start_date, status, created_at)
        VALUES 
            (club_id, 'Elite Academy Premier League', CURRENT_DATE - INTERVAL '5 days', 'active', NOW()),
            (club_id, 'ClubHub Knockout Cup', CURRENT_DATE + INTERVAL '15 days', 'upcoming', NOW())
        ON CONFLICT DO NOTHING;
    END IF;

END $$;
