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
    console.log('🌱 STARTING COMPREHENSIVE LIVE SEED MIGRATION...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // --- 1. ADMIN USER ---
        const ownerEmail = 'demo-admin@clubhub.com';
        let ownerId;
        console.log(`🔍 Checking/Creating Admin Owner: ${ownerEmail}`);
        
        const ownerRes = await client.query('SELECT id FROM users WHERE email = $1', [ownerEmail]);
        if (ownerRes.rows.length === 0) {
            const hash = await bcrypt.hash('password123', 10);
            const newOwner = await client.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, account_type, org_types)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
            `, [ownerEmail, hash, 'Demo', 'Admin', 'organization', ['club']]);
            ownerId = newOwner.rows[0].id;
            console.log('✅ Created Admin User');
        } else {
            ownerId = ownerRes.rows[0].id;
            console.log(`✅ Found Admin User: ${ownerId}`);
        }

        // --- HELPER FUNCTIONS ---
        const getOrCreateOrg = async (name, slug, desc, sport, type) => {
            const res = await client.query('SELECT id FROM organizations WHERE slug = $1', [slug]);
            if (res.rows.length > 0) return res.rows[0].id;
            
            console.log(`Creating Organization: ${name}`);
            const newOrg = await client.query(`
                INSERT INTO organizations (name, slug, description, location, sport, owner_id)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
            `, [name, slug, desc, 'London, UK', sport, ownerId]);
            
            // Link to legacy clubs table
            await client.query(`
                INSERT INTO clubs (id, name, description, location, sport, owner_id, types)
                VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING
            `, [newOrg.rows[0].id, name, desc, 'London, UK', sport, ownerId, [type]]);
            
            // Add Owner as 'owner' in RBAC
            await client.query(`
                INSERT INTO organization_members (user_id, organization_id, role, status)
                VALUES ($1, $2, 'owner', 'active') ON CONFLICT DO NOTHING
            `, [ownerId, newOrg.rows[0].id]);

            return newOrg.rows[0].id;
        };

        const createProducts = async (clubId, prefix) => {
            console.log(`   🛒 Seeding Products for Club ${clubId.substring(0,8)}...`);
            const products = [
                { name: `${prefix} Home Kit`, price: 49.99, cat: 'kit', img: 'https://placehold.co/400x400/000000/FFF?text=Home+Kit' },
                { name: `${prefix} Away Kit`, price: 49.99, cat: 'kit', img: 'https://placehold.co/400x400/cccccc/000?text=Away+Kit' },
                { name: `${prefix} Training Top`, price: 29.99, cat: 'training', img: 'https://placehold.co/400x400/blue/white?text=Training' },
                { name: `${prefix} Hoodie`, price: 39.99, cat: 'merch', img: 'https://placehold.co/400x400/red/white?text=Hoodie' },
                { name: `${prefix} Scarf`, price: 15.00, cat: 'merch', img: 'https://placehold.co/400x400/green/white?text=Scarf' },
                { name: `${prefix} Water Bottle`, price: 10.00, cat: 'equipment', img: 'https://placehold.co/400x400/yellow/black?text=Bottle' }
            ];

            for (const p of products) {
                await client.query(`
                    INSERT INTO products (club_id, name, description, price, category, image_url, stock_quantity, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, 100, true)
                `, [clubId, p.name, `Official ${p.name}`, p.price, p.cat, p.img]);
            }
        };

        const createEvents = async (clubId) => {
             console.log(`   📅 Seeding Events for Club ${clubId.substring(0,8)}...`);
             const eventTypes = ['training', 'match', 'social', 'tournament'];
             const titles = ['Weekly Training', 'League Match vs Rivals', 'Team Dinner', 'Regional Cup'];
             
             for(let i=0; i<4; i++) {
                 // Create events in future
                 const date = new Date();
                 date.setDate(date.getDate() + (i * 7) + 2); // Spread out weekly
                 
                  await client.query(`
                    INSERT INTO events (club_id, title, event_type, event_date, event_time, location, description, created_by)
                    VALUES ($1, $2, $3, $4, '18:00', 'Main Ground', 'Standard session', $5)
                 `, [clubId, titles[i], eventTypes[i], date, ownerId]);
             }
        };

        const createPlans = async (clubId) => {
            console.log(`   💳 Seeding Plans for Club ${clubId.substring(0,8)}...`);
            const plans = [
                { name: 'Elite Pathway (Gold)', price: 150.00, billing_cycle: 'month' },
                { name: 'Academy Standard (Silver)', price: 85.00, billing_cycle: 'month' },
                { name: 'Development Squad (Bronze)', price: 45.00, billing_cycle: 'month' },
                { name: 'Annual Membership', price: 500.00, billing_cycle: 'year' }
            ];

            for (const p of plans) {
                await client.query(`
                    INSERT INTO plans (club_id, name, price, interval, description, active)
                    VALUES ($1, $2, $3, $4, 'Membership Plan', true)
                `, [clubId, p.name, p.price, p.billing_cycle]);
            }
        };

        const createListingsWithApplications = async (clubId, clubName) => {
             console.log(`   📋 Seeding Listings & Applications for ${clubName}...`);
             
             // 1. Create Listings
             const listingsData = [
                 { title: `First Team Striker`, type: 'recruitment', pos: 'Forward' },
                 { title: `U18 Goalkeeper`, type: 'recruitment', pos: 'Goalkeeper' },
                 { title: `Head Coach - U14`, type: 'recruitment', pos: 'Head Coach' }
             ];

             for (const l of listingsData) {
                 const newListing = await client.query(`
                    INSERT INTO listings (club_id, title, listing_type, position, description, is_active, created_at)
                    VALUES ($1, $2, $3, $4, $5, true, NOW()) RETURNING id
                 `, [clubId, l.title, l.type, l.pos, `Open role for ${l.title} at ${clubName}`]);
                 
                 const listingId = newListing.rows[0].id;

                 // 2. Create Dummy Applicants
                 const applicants = [
                     { first: 'John', last: 'Doe', email: `john.doe.${Math.random().toString(36).substring(7)}@test.com`, pos: 'Forward' },
                     { first: 'Jane', last: 'Smith', email: `jane.smith.${Math.random().toString(36).substring(7)}@test.com`, pos: 'Goalkeeper' },
                     { first: 'Mike', last: 'Johnson', email: `mike.j.${Math.random().toString(36).substring(7)}@test.com`, pos: 'Coach' }
                 ];

                 for (const app of applicants) {
                     // Get or Create User
                     let userId;
                     const userRes = await client.query('SELECT id FROM users WHERE email = $1', [app.email]);
                     if (userRes.rows.length > 0) {
                         userId = userRes.rows[0].id;
                     } else {
                         const newUser = await client.query(`
                            INSERT INTO users (email, password_hash, first_name, last_name, account_type)
                            VALUES ($1, $2, $3, $4, 'adult') RETURNING id
                         `, [app.email, await bcrypt.hash('password', 10), app.first, app.last]);
                         userId = newUser.rows[0].id;
                     }

                     // Apply to Listing
                     await client.query(`
                        INSERT INTO listing_applications (listing_id, applicant_id, cover_letter, status, created_at)
                        VALUES ($1, $2, $3, 'pending', NOW())
                     `, [listingId, userId, `I am interested in the ${l.title} role.`]);
                 }
             }
        };
        const createStaff = async (clubId) => {
             console.log(`   👥 Seeding Staff for Club ${clubId.substring(0,8)}...`);
             const staffMembers = [
                 { first: 'Alex', last: 'Coachman', role: 'coach', email: `alex.coach.${Math.random().toString(36).substring(7)}@test.com` },
                 { first: 'Pep', last: 'Tactics', role: 'assistant-coach', email: `pep.tactics.${Math.random().toString(36).substring(7)}@test.com` },
                 { first: 'Jurgen', last: 'Press', role: 'coach', email: `jurgen.press.${Math.random().toString(36).substring(7)}@test.com` }
             ];

             for (const s of staffMembers) {
                 // Check/Create User
                 let userId;
                 const userRes = await client.query('SELECT id FROM users WHERE email = $1', [s.email]);
                 if (userRes.rows.length > 0) {
                     userId = userRes.rows[0].id;
                 } else {
                     const newUser = await client.query(`
                        INSERT INTO users (email, password_hash, first_name, last_name, account_type)
                        VALUES ($1, $2, $3, $4, 'adult') RETURNING id
                     `, [s.email, await bcrypt.hash('password123', 10), s.first, s.last]);
                     userId = newUser.rows[0].id;
                 }

                 // Add to Staff
                 await client.query(`
                    INSERT INTO staff (user_id, club_id, first_name, last_name, role, email, phone)
                    VALUES ($1, $2, $3, $4, $5, $6, '07700900000')
                    ON CONFLICT DO NOTHING
                 `, [userId, clubId, s.first, s.last, s.role, s.email]);

                 // Add to Organization Members
                 await client.query(`
                    INSERT INTO organization_members (user_id, organization_id, role, status)
                    VALUES ($1, $2, 'staff', 'active') ON CONFLICT DO NOTHING
                 `, [userId, clubId]);
             }
        };

        // --- 2. CREATE ORGANIZATIONS & DATA ---
        
        // ORG A: Elite Pro Academy
        const orgA = await getOrCreateOrg('Elite Pro Academy', 'elite-pro-academy', 'Premium Training', 'Football', 'club');
        await createProducts(orgA, 'Elite');
        await createEvents(orgA);
        await createPlans(orgA);
        await createListingsWithApplications(orgA, 'Elite Pro');
        await createStaff(orgA);

        // ORG B: Sunday League FC
        const orgB = await getOrCreateOrg('Sunday League FC', 'sunday-league-fc', 'Casual Fun', 'Football', 'club');
        await createProducts(orgB, 'Sunday');
        await createEvents(orgB);
        // await createPlans(orgB); // Maybe different plans?
        await createListingsWithApplications(orgB, 'Sunday League');
        await createStaff(orgB);

        // --- 3. MULTI-ROLE USER SCENARIO ---
        console.log('👤 Creating Multi-Role User (Coach in A, Player in B)...');
        const multiEmail = 'multi@demo.com';
        let multiUserId;

        const multiRes = await client.query('SELECT id FROM users WHERE email = $1', [multiEmail]);
        if (multiRes.rows.length === 0) {
            const hash = await bcrypt.hash('password123', 10);
            const newUser = await client.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, account_type)
                VALUES ($1, $2, 'Multi', 'User', 'adult') RETURNING id
            `, [multiEmail, hash]);
            multiUserId = newUser.rows[0].id;
        } else {
            multiUserId = multiRes.rows[0].id;
        }

        // Assign Role: COACH in Elite Pro Academy
        console.log('   -> Assigning COACH role in Elite Pro Academy');
        // 1. Add to staff
        const staffRes = await client.query(`
            INSERT INTO staff (user_id, club_id, first_name, last_name, role, email)
            VALUES ($1, $2, 'Multi', 'User', 'coach', $3) RETURNING id
        `, [multiUserId, orgA, multiEmail]);
        // 2. Add to org_members
        await client.query(`
            INSERT INTO organization_members (user_id, organization_id, role, status)
            VALUES ($1, $2, 'coach', 'active') ON CONFLICT (user_id, organization_id) DO UPDATE SET role='coach'
        `, [multiUserId, orgA]);

        // Assign Role: PLAYER in Sunday League FC
        console.log('   -> Assigning PLAYER role in Sunday League FC');
        // 1. Add to players
        const playerRes = await client.query(`
            INSERT INTO players (user_id, club_id, first_name, last_name, email, position, payment_status, date_of_birth)
            VALUES ($1, $2, 'Multi', 'User', $3, 'Midfielder', 'paid', '1995-01-01') RETURNING id
        `, [multiUserId, orgB, multiEmail]);
        // 2. Add to org_members
        await client.query(`
            INSERT INTO organization_members (user_id, organization_id, role, status)
            VALUES ($1, $2, 'player', 'active') ON CONFLICT (user_id, organization_id) DO UPDATE SET role='player'
        `, [multiUserId, orgB]);

        // --- 4. ADD OWNER AS PLAYER (For easiest testing) ---
        console.log('👤 Adding Owner as Player to both clubs for easier testing...');
        
        // Owner -> Player in Elite Pro
        await client.query(`
            INSERT INTO players (user_id, club_id, first_name, last_name, email, position, payment_status, date_of_birth)
            VALUES ($1, $2, 'Demo', 'Admin', $3, 'Striker', 'paid', '1990-01-01') 
            ON CONFLICT DO NOTHING
        `, [ownerId, orgA, ownerEmail]);
        
        // Owner -> Player in Sunday League
        await client.query(`
             INSERT INTO players (user_id, club_id, first_name, last_name, email, position, payment_status, date_of_birth)
             VALUES ($1, $2, 'Demo', 'Admin', $3, 'Goalkeeper', 'paid', '1990-01-01') 
             ON CONFLICT DO NOTHING
        `, [ownerId, orgB, ownerEmail]);


        await client.query('COMMIT');
        console.log('✅ SEEDING COMPLETE! Login with demo-admin@clubhub.com or multi@demo.com (password123)');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ SEEDING FAILED:', e);
    } finally {
        client.release();
        // Don't exit process if run via API, but here likely script
        if (require.main === module) {
            pool.end();
            process.exit();
        }
    }
}

// Run if called directly
if (require.main === module) {
    seedLive();
}

module.exports = { seedLive };
