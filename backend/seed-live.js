const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Load Env
const envFiles = ['.env', 'clubhub-dev.env', '.env.local'];
for (const file of envFiles) {
    const envPath = path.join(__dirname, file);
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        console.log(`📝 Loaded environment from ${file}`);
        break;
    }
}

const { pool } = require('./config/database');

async function seedLive() {
    console.log('🌱 STARTING LIVE SEED MIGRATION...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Identify Owner/Admin (Using the demo-admin email from logs)
        const ownerEmail = 'demo-admin@clubhub.com';
        let ownerId;
        
        console.log(`🔍 Checking for owner: ${ownerEmail}`);
        const ownerRes = await client.query('SELECT id FROM users WHERE email = $1', [ownerEmail]);
        
        if (ownerRes.rows.length === 0) {
            console.log('⚠️ Owner not found. Creating new owner...');
            const hash = await bcrypt.hash('password123', 10);
            const newOwner = await client.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, account_type, org_types)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, [ownerEmail, hash, 'Demo', 'Admin', 'organization', ['club']]);
            ownerId = newOwner.rows[0].id;
        } else {
            ownerId = ownerRes.rows[0].id;
            console.log(`✅ Owner found: ${ownerId}`);
        }

        // 2. Identify/Create Club
        let clubId;
        const clubRes = await client.query('SELECT id FROM clubs WHERE owner_id = $1', [ownerId]);
        
        if (clubRes.rows.length === 0) {
            console.log('Creating Club "Elite Pro Academy"...');
            const newClub = await client.query(`
                INSERT INTO clubs (name, description, location, sport, owner_id, types)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, ['Elite Pro Academy', 'Premier training facility for elite athletes.', 'London, UK', 'Football', ownerId, ['club']]);
            clubId = newClub.rows[0].id;
        } else {
            clubId = clubRes.rows[0].id;
            console.log(`✅ Club found: ${clubId}`);
        }

        // 3. Create Teams
        const teams = [
            { name: 'U18 Elite', age: 'Under 18', sport: 'Football', desc: 'Top tier squad' },
            { name: 'U16 Development', age: 'Under 16', sport: 'Football', desc: 'Future stars' },
            { name: 'Senior First Team', age: 'Adult', sport: 'Football', desc: 'Main competitive team' }
        ];

        let teamIds = [];
        for (const t of teams) {
            // Check if exists
            const teamCheck = await client.query('SELECT id FROM teams WHERE club_id = $1 AND name = $2', [clubId, t.name]);
            if (teamCheck.rows.length === 0) {
                const newTeam = await client.query(`
                    INSERT INTO teams (club_id, name, age_group, sport, description)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id
                `, [clubId, t.name, t.age, t.sport, t.desc]);
                teamIds.push({ id: newTeam.rows[0].id, name: t.name });
                console.log(`✅ Created Team: ${t.name}`);
            } else {
                teamIds.push({ id: teamCheck.rows[0].id, name: t.name });
                console.log(`ℹ️ Team already exists: ${t.name}`);
            }
        }

        // 3.5. Ensure Schema has CV Fields (Migration)
        console.log('🔄 Checking/Migrating Schema...');
        await client.query(`
            ALTER TABLE players 
            ADD COLUMN IF NOT EXISTS sport VARCHAR(50),
            ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
            ADD COLUMN IF NOT EXISTS location VARCHAR(100),
            ADD COLUMN IF NOT EXISTS bio TEXT
        `);
        console.log('✅ Schema ready');

        // 4. Create Players with CV Data
        const players = [
            { first: 'Marcus', last: 'Rashford', pos: 'Forward', bio: 'Academy graduate.', sport: 'Football', team: 'U18 Elite' },
            { first: 'Bukayo', last: 'Saka', pos: 'Winger', bio: 'High potential.', sport: 'Football', team: 'U18 Elite' },
            { first: 'Declan', last: 'Rice', pos: 'Midfielder', bio: 'Solid defensive mid.', sport: 'Football', team: 'Senior First Team' },
            { first: 'Phil', last: 'Foden', pos: 'Attacking Mid', bio: 'Creative playmaker.', sport: 'Football', team: 'U16 Development' },
            { first: 'Harry', last: 'Kane', pos: 'Striker', bio: 'Top scorer 2024.', sport: 'Football', team: 'Senior First Team' },
            { first: 'Jude', last: 'Bellingham', pos: 'Midfielder', bio: 'Box to box engine.', sport: 'Football', team: 'Senior First Team' }
        ];

        for (const p of players) {
            const email = `${p.first.toLowerCase()}.${p.last.toLowerCase()}@example.com`;
            
            // Check existence
            const pCheck = await client.query('SELECT id FROM players WHERE email = $1 AND club_id = $2', [email, clubId]);
            
            if (pCheck.rows.length === 0) {
                // Insert Player (Without team_id, as it's likely a separate relation)
                const res = await client.query(`
                    INSERT INTO players (
                        first_name, last_name, email, club_id, 
                        position, bio, sport, date_of_birth, 
                        gender, location
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id
                `, [
                    p.first, p.last, email, clubId,
                    p.pos, p.bio, p.sport, '2000-01-01',
                    'Male', 'London'
                ]);
                const playerId = res.rows[0].id;
                console.log(`✅ Created Player: ${p.first} ${p.last}`);

                // Try to assign team if relation exists (Optional)
                /*
                const team = teamIds.find(t => t.name === p.team);
                if (team) {
                    // Assuming player_teams table or similar exists?
                    // await client.query('INSERT INTO player_teams ...');
                }
                */
            } else {
                console.log(`ℹ️ Player already exists: ${p.first} ${p.last}`);
            }
        }

        await client.query('COMMIT');
        console.log('🎉 SEEDING COMPLETE!');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ SEEDING FAILED:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

seedLive();
