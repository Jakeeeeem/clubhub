#!/usr/bin/env node

/**
 * Complete Data Seeding Script for ClubHub
 * Creates a full working environment with:
 * - Parent users with child players
 * - Clubs with teams
 * - Events and bookings
 * - Realistic family structures
 */

const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Override DB_HOST for local execution (not Docker)
const pool = new Pool({
  host: 'localhost', // Use localhost instead of 'db' container
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seedCompleteData() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting complete data seed...\n');
    await client.query('BEGIN');

    // Pre-hashed password for all demo accounts: "Demo@123"
    const passwordHash = await bcrypt.hash('Demo@123', 10);

    // ============================================================
    // 1. CREATE PARENT USERS
    // ============================================================
    console.log('👨‍👩‍👧‍👦 Creating parent users...');
    
    const parent1 = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id, email
    `, ['parent1@demo.com', passwordHash, 'James', 'Anderson', 'adult', true]);
    
    const parent2 = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id, email
    `, ['parent2@demo.com', passwordHash, 'Sarah', 'Williams', 'adult', true]);

    const parent3 = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id, email
    `, ['parent3@demo.com', passwordHash, 'Michael', 'Brown', 'adult', true]);

    console.log(`   ✅ Created 3 parent accounts`);
    console.log(`   📧 parent1@demo.com / parent2@demo.com / parent3@demo.com`);
    console.log(`   🔑 Password: Demo@123\n`);

    // ============================================================
    // 2. CREATE CLUB OWNER & CLUB
    // ============================================================
    console.log('🏢 Creating club and owner...');
    
    const clubOwner = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id, email
    `, ['clubowner@demo.com', passwordHash, 'David', 'Thompson', 'organization', true]);

    const club = await client.query(`
      INSERT INTO clubs (name, sport, description, location, contact_email, owner_id, member_count, types)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (owner_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
    `, [
      'Elite Youth Academy',
      'Football',
      'Premier youth football academy developing future stars',
      'London, UK',
      'clubowner@demo.com',
      clubOwner.rows[0].id,
      0,
      ['club']
    ]);

    const clubId = club.rows[0].id;
    console.log(`   ✅ Club: ${club.rows[0].name}`);
    console.log(`   📧 clubowner@demo.com`);
    console.log(`   🔑 Password: Demo@123\n`);

    // ============================================================
    // 3. CREATE TEAMS
    // ============================================================
    console.log('⚽ Creating teams...');
    
    const team1 = await client.query(`
      INSERT INTO teams (name, age_group, sport, club_id, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name
    `, ['Under 12s', 'U12', 'Football', clubId, 'Development squad for 12 and under']);

    const team2 = await client.query(`
      INSERT INTO teams (name, age_group, sport, club_id, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name
    `, ['Under 14s', 'U14', 'Football', clubId, 'Competitive squad for 14 and under']);

    const team3 = await client.query(`
      INSERT INTO teams (name, age_group, sport, club_id, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name
    `, ['Under 16s', 'U16', 'Football', clubId, 'Elite squad for 16 and under']);

    console.log(`   ✅ Created 3 teams: U12s, U14s, U16s\n`);

    // ============================================================
    // 4. CREATE CHILD PLAYERS (FAMILY MEMBERS)
    // ============================================================
    console.log('👶 Creating child players (family members)...');
    
    // Parent 1's children
    const child1 = await client.query(`
      INSERT INTO players (
        first_name, last_name, date_of_birth, position, user_id, club_id, 
        sport, gender, location, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, first_name, last_name
    `, [
      'Oliver', 'Anderson', '2012-03-15', 'Forward', 
      parent1.rows[0].id, clubId, 'Football', 'Male', 'London, UK'
    ]);

    const child2 = await client.query(`
      INSERT INTO players (
        first_name, last_name, date_of_birth, position, user_id, club_id,
        sport, gender, location, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, first_name, last_name
    `, [
      'Emma', 'Anderson', '2014-07-22', 'Midfielder',
      parent1.rows[0].id, clubId, 'Football', 'Female', 'London, UK'
    ]);

    // Parent 2's children
    const child3 = await client.query(`
      INSERT INTO players (
        first_name, last_name, date_of_birth, position, user_id, club_id,
        sport, gender, location, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, first_name, last_name
    `, [
      'Noah', 'Williams', '2010-11-08', 'Defender',
      parent2.rows[0].id, clubId, 'Football', 'Male', 'London, UK'
    ]);

    // Parent 3's child
    const child4 = await client.query(`
      INSERT INTO players (
        first_name, last_name, date_of_birth, position, user_id, club_id,
        sport, gender, location, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, first_name, last_name
    `, [
      'Sophia', 'Brown', '2013-05-19', 'Goalkeeper',
      parent3.rows[0].id, clubId, 'Football', 'Female', 'London, UK'
    ]);

    console.log(`   ✅ Created 4 child players:`);
    console.log(`      - Oliver Anderson (Parent 1)`);
    console.log(`      - Emma Anderson (Parent 1)`);
    console.log(`      - Noah Williams (Parent 2)`);
    console.log(`      - Sophia Brown (Parent 3)\n`);

    // ============================================================
    // 5. ASSIGN PLAYERS TO TEAMS
    // ============================================================
    console.log('🎯 Assigning players to teams...');
    
    await client.query(`
      INSERT INTO team_players (team_id, player_id, position, jersey_number)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (team_id, player_id) DO NOTHING
    `, [team1.rows[0].id, child1.rows[0].id, 'Forward', 10]);

    await client.query(`
      INSERT INTO team_players (team_id, player_id, position, jersey_number)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (team_id, player_id) DO NOTHING
    `, [team2.rows[0].id, child2.rows[0].id, 'Midfielder', 8]);

    await client.query(`
      INSERT INTO team_players (team_id, player_id, position, jersey_number)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (team_id, player_id) DO NOTHING
    `, [team3.rows[0].id, child3.rows[0].id, 'Defender', 5]);

    await client.query(`
      INSERT INTO team_players (team_id, player_id, position, jersey_number)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (team_id, player_id) DO NOTHING
    `, [team1.rows[0].id, child4.rows[0].id, 'Goalkeeper', 1]);

    console.log(`   ✅ All players assigned to appropriate teams\n`);

    // ============================================================
    // 6. CREATE EVENTS
    // ============================================================
    console.log('📅 Creating events...');
    
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const event1 = await client.query(`
      INSERT INTO events (
        title, description, event_type, event_date, event_time, 
        location, price, club_id, team_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, title
    `, [
      'Weekly Training Session',
      'Regular training for U12s squad',
      'training',
      nextWeek,
      '18:00:00',
      'Main Pitch, Elite Academy',
      0,
      clubId,
      team1.rows[0].id,
      clubOwner.rows[0].id
    ]);

    const event2 = await client.query(`
      INSERT INTO events (
        title, description, event_type, event_date, event_time,
        location, price, club_id, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, title
    `, [
      'Summer Skills Camp',
      'Intensive 3-day skills development camp',
      'camp',
      new Date(today.getFullYear(), today.getMonth() + 1, 15),
      '09:00:00',
      'Elite Academy Training Ground',
      75.00,
      clubId,
      clubOwner.rows[0].id
    ]);

    console.log(`   ✅ Created 2 events\n`);

    // ============================================================
    // 7. UPDATE CLUB MEMBER COUNT
    // ============================================================
    await client.query(`
      UPDATE clubs SET member_count = 4 WHERE id = $1
    `, [clubId]);

    await client.query('COMMIT');
    
    console.log('✨ Complete data seed successful!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════');
    console.log('👨‍👩‍👧 Parent Accounts (with children):');
    console.log('   Email: parent1@demo.com (2 children)');
    console.log('   Email: parent2@demo.com (1 child)');
    console.log('   Email: parent3@demo.com (1 child)');
    console.log('   Password: Demo@123\n');
    console.log('🏢 Club Owner:');
    console.log('   Email: clubowner@demo.com');
    console.log('   Password: Demo@123');
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seed
if (require.main === module) {
  seedCompleteData()
    .then(() => {
      console.log('✅ Seed completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

module.exports = { seedCompleteData };
