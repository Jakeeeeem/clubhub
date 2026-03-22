-- seed-camps.sql
-- Sample seed for camps and example groups. Replace CLUB_ID and USER_ID placeholders with valid UUIDs from your DB before running.

-- Example: create a camp event (update CLUB_ID and USER_ID)
-- INSERT INTO events (id, title, description, event_type, event_date, event_time, location, price, capacity, spots_available, club_id, created_by)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Summer Skills Camp', 'Three-day coaching camp', 'camp', '2026-07-20', '09:00:00', 'Main Ground', 99.00, 100, 100, 'CLUB_ID', 'USER_ID');

-- Example: create groups for the camp (use the event id above)
-- INSERT INTO camp_groups (event_id, name, coach_id) VALUES ('00000000-0000-0000-0000-000000000001', 'Group A', NULL);
-- INSERT INTO camp_groups (event_id, name, coach_id) VALUES ('00000000-0000-0000-0000-000000000001', 'Group B', NULL);

-- Example bib assignment (replace PLAYER_ID)
-- INSERT INTO camp_bibs (event_id, player_id, bib_number, bib_color) VALUES ('00000000-0000-0000-0000-000000000001', 'PLAYER_ID', 10, 'red') ON CONFLICT (event_id, bib_number) DO UPDATE SET player_id = EXCLUDED.player_id, bib_color = EXCLUDED.bib_color;

-- Note: These are examples only. Run after ensuring referenced club, user and player records exist.
