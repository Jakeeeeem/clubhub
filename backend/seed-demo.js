const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const { pool, withTransaction } = require('./config/database');

async function seedDemoUsers() {
    console.log('🌱 Seeding demo users...');
    
    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 12);
    
    try {
        await withTransaction(async (client) => {
            // 1. Create Organization Admin
            const adminEmail = 'admin@clubhub.com';
            const adminCheck = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
            
            let adminId;
            if (adminCheck.rows.length === 0) {
                const res = await client.query(
                    `INSERT INTO users (email, password_hash, first_name, last_name, account_type, org_types) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [adminEmail, passwordHash, 'Demo', 'Admin', 'organization', ['club', 'tournament', 'event']]
                );
                adminId = res.rows[0].id;
                console.log('✅ Created Admin user');
            } else {
                adminId = adminCheck.rows[0].id;
                console.log('ℹ️ Admin user already exists');
            }

            // Create a Demo Club for the Admin
            const clubCheck = await client.query('SELECT id FROM clubs WHERE owner_id = $1', [adminId]);
            let clubId;
            if (clubCheck.rows.length === 0) {
                const res = await client.query(
                    `INSERT INTO clubs (name, description, location, types, sport, owner_id) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    ['Elite Demo Academy', 'A premium demo academy for testing.', 'London, UK', ['club'], 'Football', adminId]
                );
                clubId = res.rows[0].id;
                console.log('✅ Created Demo Club');
            } else {
                clubId = clubCheck.rows[0].id;
                console.log('ℹ️ Demo Club already exists');
            }

            // 2. Create Coach (linked to Admin's club)
            const coachEmail = 'coach@clubhub.com';
            const coachCheck = await client.query('SELECT id FROM users WHERE email = $1', [coachEmail]);
            
            let coachUserId;
            if (coachCheck.rows.length === 0) {
                const res = await client.query(
                    `INSERT INTO users (email, password_hash, first_name, last_name, account_type) 
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [coachEmail, passwordHash, 'Michael', 'Coach', 'adult']
                );
                coachUserId = res.rows[0].id;
                console.log('✅ Created Coach user');
            } else {
                coachUserId = coachCheck.rows[0].id;
            }

            // Ensure Coach is in Staff table
            const staffCheck = await client.query('SELECT id FROM staff WHERE user_id = $1', [coachUserId]);
            if (staffCheck.rows.length === 0) {
                await client.query(
                    `INSERT INTO staff (user_id, first_name, last_name, email, role, permissions, club_id) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [coachUserId, 'Michael', 'Coach', coachEmail, 'coach', ['players', 'events'], clubId]
                );
                console.log('✅ Added Coach to Staff');
            }

            // 3. Create Player/Parent
            const playerEmail = 'player@clubhub.com';
            const playerCheck = await client.query('SELECT id FROM users WHERE email = $1', [playerEmail]);
            
            let playerUserId;
            if (playerCheck.rows.length === 0) {
                const res = await client.query(
                    `INSERT INTO users (email, password_hash, first_name, last_name, account_type) 
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [playerEmail, passwordHash, 'John', 'Player', 'adult']
                );
                playerUserId = res.rows[0].id;
                console.log('✅ Created Player user');
            } else {
                playerUserId = playerCheck.rows[0].id;
            }

            // Ensure Player is in Players table
            const pRecordCheck = await client.query('SELECT id FROM players WHERE user_id = $1', [playerUserId]);
            if (pRecordCheck.rows.length === 0) {
                await client.query(
                    `INSERT INTO players (user_id, first_name, last_name, email, date_of_birth, club_id) 
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [playerUserId, 'John', 'Player', playerEmail, '1995-01-01', clubId]
                );
                console.log('✅ Added Player record');
            }
        });
        
        console.log('🏁 Seeding completed successfully!');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        await pool.end();
    }
}

seedDemoUsers();
