-- Deep Seed Demo Data for Admin
-- Associate all data with admin@clubhub.com

DO $$ 
DECLARE 
    admin_id UUID;
    org_id UUID;
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

    -- 2. Create Organization/Club
    -- Trying both table names for maximum compatibility during transition
    INSERT INTO organizations (owner_id, name, location, sport, is_active, description, created_at)
    VALUES (
        admin_id, 
        'ClubHub United Academy', 
        'London, UK', 
        'Football', 
        true, 
        'Premier professional academy showcasing elite development pathways.',
        NOW()
    ) ON CONFLICT (owner_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO org_id;

    -- Ensure a corresponding entry in clubs table if it exists separately
    INSERT INTO clubs (id, owner_id, name, location, sport, description, created_at)
    VALUES (org_id, admin_id, 'ClubHub United Academy', 'London, UK', 'Football', 'Elite Academy', NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Update user's current context
    UPDATE users SET current_organization_id = org_id WHERE id = admin_id;

    -- 3. Create Teams
    INSERT INTO teams (id, organization_id, name, age_group, sport, created_at)
    VALUES 
        (team_1_id, org_id, 'Under 16s Squad', 'U16', 'Football', NOW()),
        (team_2_id, org_id, 'Under 12s Academy', 'U12', 'Football', NOW()),
        (team_3_id, org_id, 'First Team', 'Senior', 'Football', NOW())
    ON CONFLICT (id) DO NOTHING;

    -- 4. Create Staff (Coaches)
    INSERT INTO staff (id, organization_id, first_name, last_name, role, email, is_active, created_at)
    VALUES 
        (staff_1_id, org_id, 'Alex', 'Morgan', 'Head Coach', 'alex.m@demo.clubhub.com', true, NOW()),
        ('66666666-6666-4666-a666-666666666666', org_id, 'Sam', 'Riley', 'Coach', 'sam.r@demo.clubhub.com', true, NOW()),
        ('77777777-7777-4777-a777-777777777777', org_id, 'David', 'Webb', 'Lead Scout', 'david.w@demo.clubhub.com', true, NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Link Staff 1 to Team 2
    UPDATE teams SET coach_id = staff_1_id WHERE id = team_2_id;

    -- 5. Create Players
    INSERT INTO players (first_name, last_name, email, organization_id, team_id, position, status, created_at)
    VALUES 
        ('Marcus', 'Thompson', 'marcus.t@demo.com', org_id, team_1_id, 'Forward', 'active', NOW()),
        ('Liam', 'Brown', 'liam.b@demo.com', org_id, team_1_id, 'Midfielder', 'active', NOW()),
        ('David', 'Williams', 'david.w@demo.com', org_id, team_2_id, 'Goalkeeper', 'active', NOW()),
        ('Jordan', 'Smith', 'jordan.s@demo.com', org_id, team_2_id, 'Defender', 'active', NOW()),
        ('Leo', 'Messi', 'leo.m@demo.com', org_id, team_3_id, 'Forward', 'active', NOW()),
        ('Sarah', 'Davies', 'sarah.d@demo.com', org_id, team_2_id, 'Midfielder', 'active', NOW()),
        ('Jack', 'Grealish', 'jack.g@demo.com', org_id, team_3_id, 'Winger', 'active', NOW()),
        ('Harry', 'Kane', 'harry.k@demo.com', org_id, team_3_id, 'Striker', 'active', NOW())
    ON CONFLICT (email, organization_id) DO NOTHING;

    -- 6. Create Events
    INSERT INTO events (organization_id, title, event_date, event_time, location, event_type, status, team_id, description, created_at)
    VALUES 
        (org_id, 'Summer Talent ID Camp', CURRENT_DATE + INTERVAL '7 days', '09:00', 'Main Stadium', 'camp', 'upcoming', NULL, 'Flagship talent ID camp.', NOW()),
        (org_id, 'Elite Training Session', CURRENT_DATE + INTERVAL '2 days', '18:30', 'Field A', 'training', 'upcoming', team_1_id, 'U16 Technical training.', NOW()),
        (org_id, 'First Team Match Day', CURRENT_DATE + INTERVAL '4 days', '14:00', 'Home Stadium', 'match', 'upcoming', team_3_id, 'League match vs rivals.', NOW())
    ON CONFLICT DO NOTHING;

    -- 7. Create Tournaments
    INSERT INTO tournaments (organization_id, name, start_date, status, tournament_type, created_at)
    VALUES 
        (org_id, 'Elite Academy Premier League', CURRENT_DATE - INTERVAL '5 days', 'active', 'league', NOW()),
        (org_id, 'ClubHub Knockout Cup', CURRENT_DATE + INTERVAL '15 days', 'upcoming', 'knockout', NOW())
    ON CONFLICT DO NOTHING;

END $$;
