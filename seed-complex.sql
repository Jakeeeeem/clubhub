-- ============================================================
-- CLUBHUB COMPLEX SEED - MULTI-TENANCY & FAMILY DATA
-- ============================================================
-- Password for ALL accounts: Demo@123
-- Hash: $2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe

DO $$
DECLARE
    u_owner_id UUID;
    u_player_id UUID;
    c_epa_id UUID;
    c_su_id UUID;
    c_gg_id UUID;
    t_epa_u10 UUID;
    t_epa_u12 UUID;
    t_su_firsts UUID;
    t_su_reserves UUID;
    t_gg_u8 UUID;
    t_gg_u9 UUID;
    p_player_epa UUID;
    p_player_su UUID;
    p_child1_epa UUID;
    p_child2_gg UUID;
    p_child3_su UUID;
    p_owner_gg UUID;
BEGIN
    -- 1. CLEANUP
    DELETE FROM team_players;
    DELETE FROM event_bookings;
    DELETE FROM events;
    DELETE FROM teams;
    DELETE FROM payments;
    DELETE FROM club_applications;
    DELETE FROM staff;
    DELETE FROM players;
    DELETE FROM organization_members;
    DELETE FROM clubs;
    DELETE FROM organizations;
    DELETE FROM user_preferences;
    DELETE FROM users WHERE email IN ('owner@demo.com', 'player@demo.com');

    -- 2. CREATE USERS
    INSERT INTO users (email, password_hash, first_name, last_name, account_type, is_active)
    VALUES ('owner@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'John', 'Owner', 'organization', true)
    RETURNING id INTO u_owner_id;

    INSERT INTO users (email, password_hash, first_name, last_name, account_type, is_active)
    VALUES ('player@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'Mike', 'Player', 'adult', true)
    RETURNING id INTO u_player_id;

    -- 3. CREATE ORGANIZATIONS & CLUBS
    -- Club A: Elite Pro Academy
    INSERT INTO organizations (name, slug, sport, location, owner_id)
    VALUES ('Elite Pro Academy', 'elite-pro-academy', 'Football', 'London', u_owner_id)
    RETURNING id INTO c_epa_id;

    INSERT INTO clubs (id, name, sport, location, owner_id, types)
    VALUES (c_epa_id, 'Elite Pro Academy', 'Football', 'London', u_owner_id, ARRAY['club']);

    -- Club B: Strikers United
    INSERT INTO organizations (name, slug, sport, location, owner_id)
    VALUES ('Strikers United', 'strikers-united', 'Football', 'Manchester', u_owner_id)
    RETURNING id INTO c_su_id;

    INSERT INTO clubs (id, name, sport, location, owner_id, types)
    VALUES (c_su_id, 'Strikers United', 'Football', 'Manchester', u_owner_id, ARRAY['club']);

    -- Club C: Grassroots Giants
    INSERT INTO organizations (name, slug, sport, location, owner_id)
    VALUES ('Grassroots Giants', 'grassroots-giants', 'Football', 'Birmingham', u_owner_id)
    RETURNING id INTO c_gg_id;

    INSERT INTO clubs (id, name, sport, location, owner_id, types)
    VALUES (c_gg_id, 'Grassroots Giants', 'Football', 'Birmingham', u_owner_id, ARRAY['club']);

    -- 4. ORGANIZATION MEMBERSHIPS
    -- Owner memberships
    INSERT INTO organization_members (organization_id, user_id, role, status) VALUES (c_epa_id, u_owner_id, 'owner', 'active');
    INSERT INTO organization_members (organization_id, user_id, role, status) VALUES (c_su_id, u_owner_id, 'owner', 'active');
    INSERT INTO organization_members (organization_id, user_id, role, status) VALUES (c_gg_id, u_owner_id, 'player', 'active'); -- Player role here

    -- Player memberships
    INSERT INTO organization_members (organization_id, user_id, role, status) VALUES (c_epa_id, u_player_id, 'player', 'active');
    INSERT INTO organization_members (organization_id, user_id, role, status) VALUES (c_su_id, u_player_id, 'player', 'active');
    INSERT INTO organization_members (organization_id, user_id, role, status) VALUES (c_gg_id, u_player_id, 'player', 'active'); -- For Child 2 access

    -- 5. PLAYER PROFILES (Representing the people)
    -- The main player user himself in 2 clubs
    INSERT INTO players (first_name, last_name, date_of_birth, user_id, club_id, position, sport)
    VALUES ('Mike', 'Player', '1995-05-10', u_player_id, c_epa_id, 'Forward', 'Football')
    RETURNING id INTO p_player_epa;

    INSERT INTO players (first_name, last_name, date_of_birth, user_id, club_id, position, sport)
    VALUES ('Mike', 'Player', '1995-05-10', u_player_id, c_su_id, 'Midfielder', 'Football')
    RETURNING id INTO p_player_su;

    -- Owner himself as a player in Club C
    INSERT INTO players (first_name, last_name, date_of_birth, user_id, club_id, position, sport)
    VALUES ('John', 'Owner', '1988-08-20', u_owner_id, c_gg_id, 'Goalkeeper', 'Football')
    RETURNING id INTO p_owner_gg;

    -- 3 Children for player@demo.com
    INSERT INTO players (first_name, last_name, date_of_birth, user_id, club_id, position, sport)
    VALUES ('Child', 'One', '2015-01-01', u_player_id, c_epa_id, 'Forward', 'Football')
    RETURNING id INTO p_child1_epa;

    INSERT INTO players (first_name, last_name, date_of_birth, user_id, club_id, position, sport)
    VALUES ('Child', 'Two', '2016-06-06', u_player_id, c_gg_id, 'Defender', 'Football')
    RETURNING id INTO p_child2_gg;

    INSERT INTO players (first_name, last_name, date_of_birth, user_id, club_id, position, sport)
    VALUES ('Child', 'Three', '2014-12-12', u_player_id, c_su_id, 'Forward', 'Football')
    RETURNING id INTO p_child3_su;

    -- 6. TEAMS
    INSERT INTO teams (name, age_group, sport, club_id) VALUES ('EPA U10 Lions', 'U10', 'Football', c_epa_id) RETURNING id INTO t_epa_u10;
    INSERT INTO teams (name, age_group, sport, club_id) VALUES ('EPA U12 Tigers', 'U12', 'Football', c_epa_id) RETURNING id INTO t_epa_u12;
    INSERT INTO teams (name, age_group, sport, club_id) VALUES ('SU Senior Firsts', 'Senior', 'Football', c_su_id) RETURNING id INTO t_su_firsts;
    INSERT INTO teams (name, age_group, sport, club_id) VALUES ('SU Reserves', 'Senior', 'Football', c_su_id) RETURNING id INTO t_su_reserves;
    INSERT INTO teams (name, age_group, sport, club_id) VALUES ('GG U8 Grasshoppers', 'U8', 'Football', c_gg_id) RETURNING id INTO t_gg_u8;
    INSERT INTO teams (name, age_group, sport, club_id) VALUES ('GG U9 Beetles', 'U9', 'Football', c_gg_id) RETURNING id INTO t_gg_u9;

    -- 7. TEAM ASSIGNMENTS
    INSERT INTO team_players (team_id, player_id) VALUES (t_epa_u10, p_child1_epa);
    INSERT INTO team_players (team_id, player_id) VALUES (t_epa_u12, p_player_epa);
    INSERT INTO team_players (team_id, player_id) VALUES (t_su_reserves, p_player_su);
    INSERT INTO team_players (team_id, player_id) VALUES (t_su_firsts, p_child3_su);
    INSERT INTO team_players (team_id, player_id) VALUES (t_gg_u8, p_child2_gg);
    INSERT INTO team_players (team_id, player_id) VALUES (t_gg_u9, p_owner_gg);

    -- 8. EVENTS (Create disparate events for each child/user profile)
    -- EPA U10 Lions (Child 1)
    INSERT INTO events (title, event_type, event_date, event_time, club_id, team_id, created_by)
    VALUES ('Lions Mane Training', 'training', CURRENT_DATE + INTERVAL '1 day', '17:00:00', c_epa_id, t_epa_u10, u_owner_id);
    INSERT INTO events (title, event_type, event_date, event_time, club_id, team_id, created_by, opponent)
    VALUES ('Lions vs Tigers Match', 'match', CURRENT_DATE + INTERVAL '3 days', '10:00:00', c_epa_id, t_epa_u10, u_owner_id, 'Forest FC');

    -- GG U8 Grasshoppers (Child 2)
    INSERT INTO events (title, event_type, event_date, event_time, club_id, team_id, created_by)
    VALUES ('Green Grasshoppers Jump Session', 'training', CURRENT_DATE + INTERVAL '2 days', '16:00:00', c_gg_id, t_gg_u8, u_owner_id);

    -- SU Senior Firsts (Child 3)
    INSERT INTO events (title, event_type, event_date, event_time, club_id, team_id, created_by)
    VALUES ('First Team Tactical Prep', 'training', CURRENT_DATE + INTERVAL '1 day', '19:00:00', c_su_id, t_su_firsts, u_owner_id);

    -- SU Reserves (Main Player SU)
    INSERT INTO events (title, event_type, event_date, event_time, club_id, team_id, created_by)
    VALUES ('Reserves Fitness Test', 'training', CURRENT_DATE + INTERVAL '5 days', '18:30:00', c_su_id, t_su_reserves, u_owner_id);

    -- EPA U12 Tigers (Main Player EPA)
    INSERT INTO events (title, event_type, event_date, event_time, club_id, team_id, created_by)
    VALUES ('Elite Tigers Skill Drill', 'training', CURRENT_DATE + INTERVAL '4 days', '18:00:00', c_epa_id, t_epa_u12, u_owner_id);

    -- 9. STAFF (Coaches)
    INSERT INTO staff (first_name, last_name, email, role, club_id, permissions)
    VALUES ('Coach', 'Tom', 'tom@epa.com', 'coach', c_epa_id, ARRAY['players', 'events']);
    INSERT INTO staff (first_name, last_name, email, role, club_id, permissions)
    VALUES ('Coach', 'Bill', 'bill@su.com', 'coach', c_su_id, ARRAY['players', 'events']);
    INSERT INTO staff (first_name, last_name, email, role, club_id, permissions)
    VALUES ('Coach', 'Sarah', 'sarah@gg.com', 'coach', c_gg_id, ARRAY['players', 'events']);

    -- 10. PAYMENTS (Financial activity)
    INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status)
    VALUES (p_child1_epa, c_epa_id, 50.00, 'monthly_fee', 'January Membership', CURRENT_DATE, 'paid');
    INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status)
    VALUES (p_child2_gg, c_gg_id, 45.00, 'monthly_fee', 'January Membership', CURRENT_DATE, 'pending');
    INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status)
    VALUES (p_child3_su, c_su_id, 60.00, 'monthly_fee', 'January Membership', CURRENT_DATE, 'overdue');

    -- 11. LISTINGS (One recruitment listing per club)
    INSERT INTO listings (title, description, club_id, is_active, listing_type, created_by)
    VALUES ('Looking for U10 Strikers', 'Join the Elite Pro Academy recruitment day.', c_epa_id, true, 'recruitment', u_owner_id);
    INSERT INTO listings (title, description, club_id, is_active, listing_type, created_by)
    VALUES ('SU Goalies Wanted', 'Strikers United is looking for dedicated goalkeepers.', c_su_id, true, 'recruitment', u_owner_id);
    INSERT INTO listings (title, description, club_id, is_active, listing_type, created_by)
    VALUES ('Grassroots Trial Day', 'Trial day for all age groups at Grassroots Giants.', c_gg_id, true, 'recruitment', u_owner_id);

END $$;
