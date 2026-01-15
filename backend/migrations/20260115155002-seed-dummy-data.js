'use strict';

var dbm;
var type;
var seed;

const ORG_ID = 'a5f17372-8736-4990-93d2-f23d2efd7607';

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db, callback) {
  const sql = `
    -- Teams
    INSERT INTO teams (organization_id, name, age_group, gender, level, created_at, updated_at)
    VALUES 
        ('${ORG_ID}', 'First XV Test', 'Senior', 'Men', 'Elite', NOW(), NOW()),
        ('${ORG_ID}', 'Academy U18 Test', 'U18', 'Mixed', 'Development', NOW(), NOW());

    -- Players
    INSERT INTO players (organization_id, first_name, last_name, email, phone, position, date_of_birth, payment_status, created_at, updated_at)
    VALUES 
        ('${ORG_ID}', 'John', 'Doe', 'john.doe@test.com', '555-0101', 'Forward', '2000-01-01', 'paid', NOW(), NOW()),
        ('${ORG_ID}', 'Jane', 'Smith', 'jane.smith@test.com', '555-0102', 'Back', '2002-05-15', 'pending', NOW(), NOW()),
        ('${ORG_ID}', 'Mike', 'Johnson', 'mike.j@test.com', '555-0103', 'Goalkeeper', '1999-11-20', 'paid', NOW(), NOW()),
        ('${ORG_ID}', 'Sarah', 'Connor', 'sarah.c@test.com', '555-0104', 'Midfield', '2001-03-10', 'overdue', NOW(), NOW()),
        ('${ORG_ID}', 'Tom', 'Wilson', 'tom.w@test.com', '555-0105', 'Defender', '2003-07-22', 'paid', NOW(), NOW());

    -- Events
    INSERT INTO events (organization_id, title, description, start_time, end_time, location, type, created_at, updated_at)
    VALUES 
        ('${ORG_ID}', 'Senior Training', 'Regular Tuesday training session', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 2 hours', 'Main Pitch', 'training', NOW(), NOW()),
        ('${ORG_ID}', 'Academy Match', 'Home game vs Rivals', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 3 hours', 'Stadium', 'match', NOW(), NOW()),
        ('${ORG_ID}', 'Club Social', 'Annual BBQ', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days 4 hours', 'Clubhouse', 'social', NOW(), NOW());

    -- Listings
    INSERT INTO listings (organization_id, title, description, positions, status, created_at, updated_at)
    VALUES 
        ('${ORG_ID}', 'Looking for Prop', 'We need a strong prop for the First XV.', '["Prop", "Forward"]', 'active', NOW(), NOW()),
        ('${ORG_ID}', 'Academy Trials', 'Open trials for U18 academy.', '["All Positions"]', 'active', NOW(), NOW());
  `;
  
  db.runSql(sql, callback);
};

exports.down = function(db, callback) {
  const sql = `
    DELETE FROM listings WHERE organization_id = '${ORG_ID}' AND title IN ('Looking for Prop', 'Academy Trials');
    DELETE FROM events WHERE organization_id = '${ORG_ID}';
    DELETE FROM players WHERE organization_id = '${ORG_ID}';
    DELETE FROM teams WHERE organization_id = '${ORG_ID}';
  `;
  db.runSql(sql, callback);
};
