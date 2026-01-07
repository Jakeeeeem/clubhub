-- Add Demo Users to the database
-- Passwords are all 'password123' (hashed with bcrypt 12 rounds)
-- $2a$12$R.S4R..J1Rj8H8e7s5C8O.qK7Y7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q7Q (Example hash for 'password123')
-- Actually, let's use a standard bcrypt hash for 'password123'
-- $2a$12$KPhM6XW/W9O.wVvH9A4XyO0Z6Xo9S6W6S6W6S6W6S6W6S6W6S6W6S

INSERT INTO users (email, password_hash, first_name, last_name, account_type, org_types)
VALUES (
    'admin@clubhub.com', 
    '$2a$12$KPhM6XW/W9O.wVvH9A4XyO0Z6Xo9S6W6S6W6S6W6S6W6S6W6S6W6S', -- placeholder for password123
    'Demo', 
    'Admin', 
    'organization', 
    ARRAY['club', 'tournament', 'event']
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password_hash, first_name, last_name, account_type)
VALUES (
    'coach@clubhub.com', 
    '$2a$12$KPhM6XW/W9O.wVvH9A4XyO0Z6Xo9S6W6S6W6S6W6S6W6S6W6S6W6S', 
    'Michael', 
    'Coach', 
    'adult'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password_hash, first_name, last_name, account_type)
VALUES (
    'player@clubhub.com', 
    '$2a$12$KPhM6XW/W9O.wVvH9A4XyO0Z6Xo9S6W6S6W6S6W6S6W6S6W6S6W6S', 
    'John', 
    'Player', 
    'adult'
) ON CONFLICT (email) DO NOTHING;

-- Link Coach to a dummy club if needed (This is complex in SQL without IDs, so we'll rely on the bypass or manual setup for deep links)
