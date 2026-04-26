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

    -- 2. Ensure Organization exists (New Schema)
    SELECT id INTO org_id FROM organizations WHERE owner_id = admin_id LIMIT 1;
    
    IF org_id IS NULL THEN
        INSERT INTO organizations (owner_id, name, slug, location, sport, description, created_at)
        VALUES (
            admin_id, 
            'ClubHub United Academy', 
            'clubhub-united-' || floor(random()*1000)::text,
            'London, UK', 
            'Football', 
            'Premier professional academy showcasing elite development pathways.',
            NOW()
        ) RETURNING id INTO org_id;
    END IF;

    -- 3. Sync to Clubs table (Legacy Schema)
    IF NOT EXISTS (SELECT 1 FROM clubs WHERE id = org_id) THEN
        INSERT INTO clubs (id, owner_id, name, location, sport, description, types, created_at)
        VALUES (
            org_id,
            admin_id, 
            'ClubHub United Academy', 
            'London, UK', 
            'Football', 
            'Elite Academy',
            ARRAY['club', 'academy'],
            NOW()
        );
    END IF;

    -- 4. Set User Preferences
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
        INSERT INTO user_preferences (user_id, current_organization_id)
        VALUES (admin_id, org_id)
        ON CONFLICT (user_id) DO UPDATE SET current_organization_id = EXCLUDED.current_organization_id;
    END IF;

    -- 5. Create Teams
    IF NOT EXISTS (SELECT 1 FROM teams WHERE id = team_1_id) THEN
        INSERT INTO teams (id, club_id, name, age_group, sport, created_at)
        VALUES (team_1_id, org_id, 'Under 16s Squad', 'U16', 'Football', NOW());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM teams WHERE id = team_2_id) THEN
        INSERT INTO teams (id, club_id, name, age_group, sport, created_at)
        VALUES (team_2_id, org_id, 'Under 12s Academy', 'U12', 'Football', NOW());
    END IF;

    -- 6. Create Staff & Members
    IF NOT EXISTS (SELECT 1 FROM staff WHERE id = staff_1_id) THEN
        INSERT INTO staff (id, club_id, first_name, last_name, role, email, created_at)
        VALUES (staff_1_id, org_id, 'Alex', 'Morgan', 'coach', 'alex.m@demo.clubhub.com', NOW());
    END IF;

    -- 7. Create Players
    IF NOT EXISTS (SELECT 1 FROM players WHERE email = 'marcus.t@demo.com') THEN
        INSERT INTO players (first_name, last_name, email, club_id, date_of_birth, position, payment_status, created_at)
        VALUES ('Marcus', 'Thompson', 'marcus.t@demo.com', org_id, '2008-05-15', 'Forward', 'paid', NOW());
    END IF;

    -- 8. Create Events
    IF NOT EXISTS (SELECT 1 FROM events WHERE club_id = org_id AND title = 'Summer Talent ID Camp') THEN
        INSERT INTO events (club_id, title, event_date, event_time, location, event_type, team_id, description, created_by, created_at)
        VALUES (org_id, 'Summer Talent ID Camp', CURRENT_DATE + INTERVAL '7 days', '09:00', 'Main Stadium', 'camp', NULL, 'Flagship camp.', admin_id, NOW());
    END IF;

END $$;
