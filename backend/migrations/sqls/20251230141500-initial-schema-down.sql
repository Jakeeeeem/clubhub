-- Drop triggers
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
DROP TRIGGER IF EXISTS update_product_orders_updated_at ON product_orders;
DROP TRIGGER IF EXISTS update_tactical_formations_updated_at ON tactical_formations;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
DROP TRIGGER IF EXISTS update_availability_responses_updated_at ON availability_responses;
DROP TRIGGER IF EXISTS update_club_applications_updated_at ON club_applications;
DROP TRIGGER IF EXISTS update_event_bookings_updated_at ON event_bookings;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
DROP TRIGGER IF EXISTS update_players_updated_at ON players;
DROP TRIGGER IF EXISTS update_clubs_updated_at ON clubs;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS product_orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS player_plans;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS tactical_formations;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS availability_responses;
DROP TABLE IF EXISTS club_applications;
DROP TABLE IF EXISTS player_ratings;
DROP TABLE IF EXISTS match_results;
DROP TABLE IF EXISTS event_bookings;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS team_players;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS clubs;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS users;

-- Drop extension
DROP EXTENSION IF EXISTS "uuid-ossp";
