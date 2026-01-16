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

        // 2. Identify/Create Organization (using organizations table, not clubs)
        let orgId;
        const orgRes = await client.query('SELECT id FROM organizations WHERE owner_id = $1', [ownerId]);
        
        if (orgRes.rows.length === 0) {
            console.log('Creating Organization "Elite Pro Academy"...');
            const slug = 'elite-pro-academy';
            const newOrg = await client.query(`
                INSERT INTO organizations (name, slug, description, location, sport, owner_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, ['Elite Pro Academy', slug, 'Premier training facility for elite athletes.', 'London, UK', 'Football', ownerId]);
            orgId = newOrg.rows[0].id;
        } else {
            orgId = orgRes.rows[0].id;
            console.log(`✅ Organization found: ${orgId}`);
        }

        // Also get the club_id for teams/players (clubs table still exists for legacy)
        let clubId;
        const clubRes = await client.query('SELECT id FROM clubs WHERE owner_id = $1', [ownerId]);
        if (clubRes.rows.length > 0) {
            clubId = clubRes.rows[0].id;
        } else {
            // Create club entry if needed
            const newClub = await client.query(`
                INSERT INTO clubs (name, description, location, sport, owner_id, types)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, ['Elite Pro Academy', 'Premier training facility for elite athletes.', 'London, UK', 'Football', ownerId, ['club']]);
            clubId = newClub.rows[0].id;
        }

        // 2.1. Ensure Owner is in organization_members (RBAC) - using orgId
        const memberCheck = await client.query('SELECT 1 FROM organization_members WHERE user_id = $1 AND organization_id = $2', [ownerId, orgId]);
        if (memberCheck.rows.length === 0) {
            await client.query(`
                INSERT INTO organization_members (user_id, organization_id, role, status)
                VALUES ($1, $2, 'owner', 'active')
            `, [ownerId, orgId]);
            console.log('✅ Added Owner to organization_members');
        }

        // 2.2. Create Secondary Organization (Multi-Tenancy Test)
        const secOrgName = 'Sunday League FC';
        const secOrgSlug = 'sunday-league-fc';
        let secOrgId, secClubId;
        const secOrgRes = await client.query('SELECT id FROM organizations WHERE slug = $1', [secOrgSlug]);
        
        if (secOrgRes.rows.length === 0) {
            const newSecOrg = await client.query(`
                INSERT INTO organizations (name, slug, description, location, sport, owner_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, [secOrgName, secOrgSlug, 'Casual sunday games', 'Local Park', 'Football', ownerId]);
            secOrgId = newSecOrg.rows[0].id;
            console.log(`✅ Created Secondary Organization: ${secOrgName}`);
            
            // Also create club entry
            const newSecClub = await client.query(`
                INSERT INTO clubs (name, description, location, sport, owner_id, types)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, [secOrgName, 'Casual sunday games', 'Local Park', 'Football', ownerId, ['club']]);
            secClubId = newSecClub.rows[0].id;
        } else {
            secOrgId = secOrgRes.rows[0].id;
            const secClubRes = await client.query('SELECT id FROM clubs WHERE name = $1', [secOrgName]);
            secClubId = secClubRes.rows.length > 0 ? secClubRes.rows[0].id : null;
        }

        // 2.3 Add User as PLAYER in Secondary Organization
        const secMemberCheck = await client.query('SELECT 1 FROM organization_members WHERE user_id = $1 AND organization_id = $2', [ownerId, secOrgId]);
        if (secMemberCheck.rows.length === 0) {
            await client.query(`
                INSERT INTO organization_members (user_id, organization_id, role, status)
                VALUES ($1, $2, 'player', 'active')
            `, [ownerId, secOrgId]);
            console.log(`✅ Added User as PLAYER to ${secOrgName}`);
        }

        // 3. Create Coaches (Staff)
        console.log('👔 Creating Coaches/Staff...');
        const coaches = [
            { first: 'Pep', last: 'Guardiola', role: 'coach', email: 'pep.guardiola@elitepro.com', phone: '+44 7700 900001' },
            { first: 'Jurgen', last: 'Klopp', role: 'coach', email: 'jurgen.klopp@elitepro.com', phone: '+44 7700 900002' },
            { first: 'Carlo', last: 'Ancelotti', role: 'assistant-coach', email: 'carlo.ancelotti@elitepro.com', phone: '+44 7700 900003' },
            { first: 'Emma', last: 'Hayes', role: 'coaching-supervisor', email: 'emma.hayes@elitepro.com', phone: '+44 7700 900004' }
        ];

        let staffIds = [];
        for (const coach of coaches) {
            const staffCheck = await client.query('SELECT id FROM staff WHERE email = $1 AND club_id = $2', [coach.email, clubId]);
            
            if (staffCheck.rows.length === 0) {
                const newStaff = await client.query(`
                    INSERT INTO staff (first_name, last_name, email, phone, role, club_id)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                `, [coach.first, coach.last, coach.email, coach.phone, coach.role, clubId]);
                staffIds.push({ id: newStaff.rows[0].id, name: `${coach.first} ${coach.last}`, role: coach.role });
                console.log(`✅ Created Coach: ${coach.first} ${coach.last} (${coach.role})`);
            } else {
                staffIds.push({ id: staffCheck.rows[0].id, name: `${coach.first} ${coach.last}`, role: coach.role });
                console.log(`ℹ️ Coach already exists: ${coach.first} ${coach.last}`);
            }
        }

        // 4. Create Teams with Coach Assignments
        const teams = [
            { name: 'U18 Elite', age: 'Under 18', sport: 'Football', desc: 'Top tier squad', coachName: 'Pep Guardiola' },
            { name: 'U16 Development', age: 'Under 16', sport: 'Football', desc: 'Future stars', coachName: 'Jurgen Klopp' },
            { name: 'Senior First Team', age: 'Adult', sport: 'Football', desc: 'Main competitive team', coachName: 'Pep Guardiola' }
        ];

        let teamIds = [];
        for (const t of teams) {
            // Find coach for this team
            const assignedCoach = staffIds.find(s => s.name === t.coachName);
            
            const teamCheck = await client.query('SELECT id FROM teams WHERE club_id = $1 AND name = $2', [clubId, t.name]);
            if (teamCheck.rows.length === 0) {
                const newTeam = await client.query(`
                    INSERT INTO teams (club_id, name, age_group, sport, description, coach_id, wins, losses, draws)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING id
                `, [clubId, t.name, t.age, t.sport, t.desc, assignedCoach?.id, Math.floor(Math.random() * 10), Math.floor(Math.random() * 5), Math.floor(Math.random() * 3)]);
                teamIds.push({ id: newTeam.rows[0].id, name: t.name });
                console.log(`✅ Created Team: ${t.name} (Coach: ${t.coachName})`);
            } else {
                // Update coach if team exists
                if (assignedCoach) {
                    await client.query('UPDATE teams SET coach_id = $1 WHERE id = $2', [assignedCoach.id, teamCheck.rows[0].id]);
                }
                teamIds.push({ id: teamCheck.rows[0].id, name: t.name });
                console.log(`ℹ️ Team already exists: ${t.name}`);
            }
        }

        // 5. Ensure Schema has CV Fields (Migration)
        console.log('🔄 Checking/Migrating Schema...');
        await client.query(`
            ALTER TABLE players 
            ADD COLUMN IF NOT EXISTS sport VARCHAR(50),
            ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
            ADD COLUMN IF NOT EXISTS location VARCHAR(100),
            ADD COLUMN IF NOT EXISTS bio TEXT
        `);
        console.log('✅ Schema ready');

        // 6. Create Players with CV Data (Expanded)
        console.log('👥 Creating Players...');
        const players = [
            { first: 'Marcus', last: 'Rashford', pos: 'Forward', bio: 'Academy graduate with pace and finishing.', sport: 'Football', team: 'U18 Elite', jersey: 10 },
            { first: 'Bukayo', last: 'Saka', pos: 'Winger', bio: 'High potential winger.', sport: 'Football', team: 'U18 Elite', jersey: 7 },
            { first: 'Declan', last: 'Rice', pos: 'Midfielder', bio: 'Solid defensive midfielder.', sport: 'Football', team: 'Senior First Team', jersey: 4 },
            { first: 'Phil', last: 'Foden', pos: 'Attacking Mid', bio: 'Creative playmaker.', sport: 'Football', team: 'U16 Development', jersey: 47 },
            { first: 'Harry', last: 'Kane', pos: 'Striker', bio: 'Top scorer 2024.', sport: 'Football', team: 'Senior First Team', jersey: 9 },
            { first: 'Jude', last: 'Bellingham', pos: 'Midfielder', bio: 'Box to box engine.', sport: 'Football', team: 'Senior First Team', jersey: 5 },
            { first: 'Cole', last: 'Palmer', pos: 'Winger', bio: 'Skillful and creative.', sport: 'Football', team: 'U18 Elite', jersey: 20 },
            { first: 'Kobbie', last: 'Mainoo', pos: 'Midfielder', bio: 'Young talent with vision.', sport: 'Football', team: 'U16 Development', jersey: 37 },
            { first: 'Alejandro', last: 'Garnacho', pos: 'Winger', bio: 'Explosive pace and dribbling.', sport: 'Football', team: 'U18 Elite', jersey: 17 },
            { first: 'Levi', last: 'Colwill', pos: 'Defender', bio: 'Strong in the air.', sport: 'Football', team: 'U16 Development', jersey: 6 },
            { first: 'Trent', last: 'Alexander-Arnold', pos: 'Right Back', bio: 'Excellent crossing ability.', sport: 'Football', team: 'Senior First Team', jersey: 66 },
            { first: 'Reece', last: 'James', pos: 'Right Back', bio: 'Powerful and athletic.', sport: 'Football', team: 'Senior First Team', jersey: 24 }
        ];

        let playerIdMap = [];
        for (const p of players) {
            const email = `${p.first.toLowerCase()}.${p.last.toLowerCase()}@example.com`;
            
            const pCheck = await client.query('SELECT id FROM players WHERE email = $1 AND club_id = $2', [email, clubId]);
            
            if (pCheck.rows.length === 0) {
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
                    p.pos, p.bio, p.sport, '2005-06-15',
                    'Male', 'London'
                ]);
                const playerId = res.rows[0].id;
                playerIdMap.push({ id: playerId, teamName: p.team, jersey: p.jersey, name: `${p.first} ${p.last}` });
                console.log(`✅ Created Player: ${p.first} ${p.last}`);
            } else {
                playerIdMap.push({ id: pCheck.rows[0].id, teamName: p.team, jersey: p.jersey, name: `${p.first} ${p.last}` });
                console.log(`ℹ️ Player already exists: ${p.first} ${p.last}`);
            }
        }

        // 7. Assign Players to Teams via team_players
        console.log('🔗 Assigning Players to Teams...');
        for (const player of playerIdMap) {
            const team = teamIds.find(t => t.name === player.teamName);
            if (team) {
                const tpCheck = await client.query('SELECT 1 FROM team_players WHERE team_id = $1 AND player_id = $2', [team.id, player.id]);
                if (tpCheck.rows.length === 0) {
                    await client.query(`
                        INSERT INTO team_players (team_id, player_id, jersey_number)
                        VALUES ($1, $2, $3)
                    `, [team.id, player.id, player.jersey]);
                    console.log(`✅ Assigned ${player.name} to ${team.name} (Jersey #${player.jersey})`);
                }
            }
        }

        // 8. Create Events
        console.log('📅 Creating Events...');
        const events = [
            {
                title: 'Weekly Training Session',
                description: 'Regular training for U18 Elite squad',
                type: 'training',
                date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
                time: '18:00',
                location: 'Main Training Ground',
                teamName: 'U18 Elite'
            },
            {
                title: 'Match vs City Rivals',
                description: 'Important league match',
                type: 'match',
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
                time: '15:00',
                location: 'Home Stadium',
                opponent: 'City Rivals FC',
                teamName: 'Senior First Team'
            },
            {
                title: 'Youth Development Camp',
                description: 'Intensive 3-day training camp for young players',
                type: 'camp',
                date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
                time: '09:00',
                location: 'Training Complex',
                price: 50.00,
                capacity: 30,
                teamName: 'U16 Development'
            },
            {
                title: 'Friendly Tournament',
                description: 'Pre-season friendly tournament',
                type: 'tournament',
                date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 weeks from now
                time: '10:00',
                location: 'Sports Complex',
                price: 25.00,
                capacity: 50,
                teamName: 'U18 Elite'
            },
            {
                title: 'Tactical Session',
                description: 'Focus on set pieces and defensive organization',
                type: 'training',
                date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 days from now
                time: '17:30',
                location: 'Training Ground B',
                teamName: 'Senior First Team'
            }
        ];

        let eventIds = [];
        for (const evt of events) {
            const team = teamIds.find(t => t.name === evt.teamName);
            
            const eventCheck = await client.query('SELECT id FROM events WHERE title = $1 AND club_id = $2', [evt.title, clubId]);
            
            if (eventCheck.rows.length === 0) {
                const newEvent = await client.query(`
                    INSERT INTO events (
                        title, description, event_type, event_date, event_time,
                        location, price, capacity, spots_available, club_id, team_id,
                        opponent, created_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    RETURNING id
                `, [
                    evt.title, evt.description, evt.type, evt.date, evt.time,
                    evt.location, evt.price || 0, evt.capacity || null, evt.capacity || null,
                    clubId, team?.id, evt.opponent || null, ownerId
                ]);
                eventIds.push({ id: newEvent.rows[0].id, title: evt.title });
                console.log(`✅ Created Event: ${evt.title} (${evt.type})`);
            } else {
                eventIds.push({ id: eventCheck.rows[0].id, title: evt.title });
                console.log(`ℹ️ Event already exists: ${evt.title}`);
            }
        }

        // 9. Ensure owner is linked to ALL organizations
        console.log('🔗 Ensuring owner is linked to all organizations...');
        const allOrgs = await client.query('SELECT id, name FROM organizations');
        
        for (const org of allOrgs.rows) {
            const linkCheck = await client.query('SELECT 1 FROM organization_members WHERE user_id = $1 AND organization_id = $2', [ownerId, org.id]);
            
            if (linkCheck.rows.length === 0) {
                // Determine role based on whether they own it
                const ownerCheck = await client.query('SELECT 1 FROM organizations WHERE id = $1 AND owner_id = $2', [org.id, ownerId]);
                const role = ownerCheck.rows.length > 0 ? 'owner' : 'admin';
                
                await client.query(`
                    INSERT INTO organization_members (user_id, organization_id, role, status)
                    VALUES ($1, $2, $3, 'active')
                `, [ownerId, org.id, role]);
                console.log(`✅ Linked ${ownerEmail} to ${org.name} as ${role}`);
            }
        }

        await client.query('COMMIT');
        console.log('🎉 SEEDING COMPLETE!');
        console.log(`📊 Summary:
  - Organizations: ${allOrgs.rows.length}
  - Teams: ${teamIds.length}
  - Coaches: ${staffIds.length}
  - Players: ${playerIdMap.length}
  - Events: ${eventIds.length}
  - All organizations linked to owner
        `);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ SEEDING FAILED:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

seedLive();


