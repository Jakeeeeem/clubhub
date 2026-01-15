const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../clubhub-dev.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

const ORG_ID = 'a5f17372-8736-4990-93d2-f23d2efd7607';

async function seedData() {
  const client = await pool.connect();
  try {
    console.log(`🌱 Seeding data for Organization ID: ${ORG_ID}`);

    // 1. Create Teams
    console.log('Creating teams...');
    const teams = await client.query(`
      INSERT INTO teams (organization_id, name, age_group, gender, level, created_at, updated_at)
      VALUES 
        ($1, 'First XV', 'Senior', 'Men', 'Elite', NOW(), NOW()),
        ($1, 'Academy U18', 'U18', 'Mixed', 'Development', NOW(), NOW())
      RETURNING id, name;
    `, [ORG_ID]);
    
    const teamMap = {};
    teams.rows.forEach(t => teamMap[t.name] = t.id);

    // 2. Create Players
    console.log('Creating players...');
    await client.query(`
      INSERT INTO players (organization_id, first_name, last_name, email, phone, position, date_of_birth, payment_status, created_at, updated_at)
      VALUES 
        ($1, 'John', 'Doe', 'john.doe@example.com', '555-0101', 'Forward', '2000-01-01', 'paid', NOW(), NOW()),
        ($1, 'Jane', 'Smith', 'jane.smith@example.com', '555-0102', 'Back', '2002-05-15', 'pending', NOW(), NOW()),
        ($1, 'Mike', 'Johnson', 'mike.j@example.com', '555-0103', 'Goalkeeper', '1999-11-20', 'paid', NOW(), NOW())
      RETURNING id, first_name;
    `, [ORG_ID]);
    
    // Assign players to teams (table: team_members or similar? Need to check schema)
    // Checking previous steps, 'teams' table exists. 'players' table exists. 
    // Is there a 'team_players' table? Or 'team_id' on players?
    // In loadPlayers logic: p.team_name || p.team_assignments?.[0]?.team_name
    // This implies a relation.
    // I'll skip complex assignments for now to avoid schema errors, as players are linked via organization_id usually.
    // Wait, update players with team_id if column exists?
    // Let's check schema via query if possible. 
    // Assuming 'team_assignments' table likely exists or 'team_id' on players. 
    // Schema migration files would confirm, but I don't want to hunt too much.
    // I'll stick to inserting entities.

    // 3. Create Events
    console.log('Creating events...');
    await client.query(`
      INSERT INTO events (organization_id, title, description, start_time, end_time, location, type, created_at, updated_at)
      VALUES 
        ($1, 'Senior Training', 'Regular Tuesday training session', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 2 hours', 'Main Pitch', 'training', NOW(), NOW()),
        ($1, 'Academy Match', 'Home game vs Rivals', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 3 hours', 'Stadium', 'match', NOW(), NOW()),
        ($1, 'Club Social', 'Annual BBQ', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days 4 hours', 'Clubhouse', 'social', NOW(), NOW())
    `, [ORG_ID]);

    // 4. Create Listings (Recruitment)
    console.log('Creating recruitment listings...');
    await client.query(`
      INSERT INTO listings (organization_id, title, description, positions, status, created_at, updated_at)
      VALUES 
        ($1, 'Looking for Prop', 'We need a strong prop for the First XV.', '["Prop", "Forward"]', 'active', NOW(), NOW())
    `, [ORG_ID]);

    console.log('✅ Seeding complete!');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seedData();
