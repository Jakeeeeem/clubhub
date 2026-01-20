-- ClubHub Seed Data
-- Creates 3 parent accounts with children for testing

-- Create Parent 1: James Anderson
INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
VALUES ('parent1@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'James', 'Anderson', 'adult', true)
ON CONFLICT (email) DO NOTHING;

-- Create Parent 2: Sarah Williams
INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
VALUES ('parent2@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'Sarah', 'Williams', 'adult', true)
ON CONFLICT (email) DO NOTHING;

-- Create Parent 3: Michael Brown
INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
VALUES ('parent3@demo.com', '$2a$10$a7muOzgZRnxWloVG7IdFlOcX9a7a64l314CvNgPZgkZNUf.nczFSe', 'Michael', 'Brown', 'adult', true)
ON CONFLICT (email) DO NOTHING;

-- Add children for Parent 1
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, sport, gender, location)
SELECT 'Oliver', 'Anderson', '2012-03-15', 'Forward', id, 'Football', 'Male', 'London, UK'
FROM users WHERE email = 'parent1@demo.com';

INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, sport, gender, location)
SELECT 'Emma', 'Anderson', '2014-07-22', 'Midfielder', id, 'Football', 'Female', 'London, UK'
FROM users WHERE email = 'parent1@demo.com';

-- Add child for Parent 2
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, sport, gender, location)
SELECT 'Noah', 'Williams', '2010-11-08', 'Defender', id, 'Football', 'Male', 'London, UK'
FROM users WHERE email = 'parent2@demo.com';

-- Add child for Parent 3
INSERT INTO players (first_name, last_name, date_of_birth, position, user_id, sport, gender, location)
SELECT 'Sophia', 'Brown', '2013-05-19', 'Goalkeeper', id, 'Football', 'Female', 'London, UK'
FROM users WHERE email = 'parent3@demo.com';
