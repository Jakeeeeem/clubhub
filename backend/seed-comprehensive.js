const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function comprehensiveSeed() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting comprehensive multi-role seed...\n');
    
    // ============================================
    // STEP 1: Clear existing data (outside transaction)
    // ============================================
    console.log('📋 Step 1: Clearing existing data...');
    
    const tablesToClear = [
      'team_players', 'teams', 'events', 'payments',
      'organization_members', 'staff', 'players',
      'user_preferences', 'organizations', 'clubs', 'users'
    ];
    
    for (const table of tablesToClear) {
      try {
        // Use a separate statement for each truncate to avoid transaction abort
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        console.log(`  ✓ Cleared ${table}`);
      } catch (err) {
        // Ignore errors for tables that don't exist or can't be truncated
        console.log(`  ⚠️  Skipped ${table} (${err.message.split('\n')[0]})`);
      }
    }
    
    console.log('\n');
    
    // NOW start the transaction for inserts
    await client.query('BEGIN');
    
    // ============================================
    // STEP 2: Create Main User (demo-admin)
    // ============================================
    console.log('📋 Step 2: Creating main user...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const userResult = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, account_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name
    `, ['demo-admin@clubhub.com', hashedPassword, 'Demo', 'Admin', 'organization']);
    
    const mainUser = userResult.rows[0];
    console.log(`  ✓ Created user: ${mainUser.first_name} ${mainUser.last_name}`);
    
    await client.query(`INSERT INTO user_preferences (user_id) VALUES ($1)`, [mainUser.id]);
    
    console.log('\n');
    
    // ============================================
    // STEP 3: Create 3 Organizations
    // ============================================
    console.log('📋 Step 3: Creating organizations...');
    
    const orgs = [
      { name: 'Elite Pro Academy', location: 'London, UK', description: 'Premier youth football academy', role: 'owner' },
      { name: 'Sunday League FC', location: 'Manchester, UK', description: 'Community football club', role: 'player' },
      { name: 'Valley United', location: 'Birmingham, UK', description: 'Competitive youth club', role: 'coach' }
    ];
    
    const createdOrgs = [];
    
    for (const org of orgs) {
      const slug = org.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Create organization
      const orgResult = await client.query(`
        INSERT INTO organizations (name, slug, description, sport, location, owner_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, sport, location
      `, [org.name, slug, org.description, 'Football', org.location, mainUser.id]);
      
      const createdOrg = orgResult.rows[0];
      createdOrg.userRole = org.role;
      createdOrgs.push(createdOrg);
      
      // Create matching club entry
      await client.query(`
        INSERT INTO clubs (id, name, description, sport, location, owner_id, types)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [createdOrg.id, org.name, org.description, 'Football', org.location, mainUser.id, ['academy']]);
      
      // Add user to organization with appropriate role
      await client.query(`
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES ($1, $2, $3)
      `, [createdOrg.id, mainUser.id, org.role]);
      
      console.log(`  ✓ Created: ${createdOrg.name} (You are: ${org.role})`);
    }
    
    console.log('\n');
    
    // ============================================
    // STEP 4: Create Your Player Profile (for Sunday League FC)
    // ============================================
    console.log('📋 Step 4: Creating your player profile...');
    
    const sundayLeague = createdOrgs.find(o => o.name === 'Sunday League FC');
    
    const playerResult = await client.query(`
      INSERT INTO players (
        user_id, club_id, first_name, last_name, date_of_birth,
        gender, sport, position, location
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, first_name, last_name
    `, [
      mainUser.id, sundayLeague.id, mainUser.first_name, mainUser.last_name,
      '1985-06-15', 'male', 'Football', 'Midfielder', sundayLeague.location
    ]);
    
    const yourPlayer = playerResult.rows[0];
    console.log(`  ✓ Created your player profile in ${sundayLeague.name}`);
    
    console.log('\n');
    
    // ============================================
    // STEP 5: Create Your Family Members (Children)
    // ============================================
    console.log('📋 Step 5: Creating family members...');
    
    const children = [
      { first_name: 'Tommy', last_name: 'Admin', dob: '2012-03-15', gender: 'male', position: 'Forward', org_index: 0 },
      { first_name: 'Emma', last_name: 'Admin', dob: '2014-07-22', gender: 'female', position: 'Midfielder', org_index: 1 },
      { first_name: 'Jack', last_name: 'Admin', dob: '2010-11-08', gender: 'male', position: 'Defender', org_index: 2 }
    ];
    
    const createdChildren = [];
    
    for (const child of children) {
      const org = createdOrgs[child.org_index];
      
      const childResult = await client.query(`
        INSERT INTO players (
          user_id, club_id, first_name, last_name, date_of_birth,
          gender, sport, position, location
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, first_name, last_name, position
      `, [
        mainUser.id, org.id, child.first_name, child.last_name, child.dob,
        child.gender, 'Football', child.position, org.location
      ]);
      
      createdChildren.push({ ...childResult.rows[0], club_id: org.id, club_name: org.name });
      console.log(`  ✓ ${child.first_name} → ${org.name} (${child.position})`);
    }
    
    console.log('\n');
    
    // ============================================
    // STEP 6: Create Other Players for Each Club
    // ============================================
    console.log('📋 Step 6: Creating other players...');
    
    const otherPlayers = [
      { first_name: 'James', last_name: 'Wilson', position: 'Striker' },
      { first_name: 'Oliver', last_name: 'Brown', position: 'Defender' },
      { first_name: 'Sophie', last_name: 'Taylor', position: 'Goalkeeper' },
      { first_name: 'Lucas', last_name: 'Davies', position: 'Midfielder' }
    ];
    
    let playerCount = 0;
    
    for (const org of createdOrgs) {
      for (let i = 0; i < 4; i++) {
        const player = otherPlayers[i];
        await client.query(`
          INSERT INTO players (
            club_id, first_name, last_name, date_of_birth,
            gender, sport, position, location
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          org.id, player.first_name, player.last_name, '2011-01-01',
          'male', 'Football', player.position, org.location
        ]);
        playerCount++;
      }
      console.log(`  ✓ Added 4 players to ${org.name}`);
    }
    
    console.log(`  📊 Total other players: ${playerCount}\n`);
    
    // ============================================
    // STEP 7: Create Teams
    // ============================================
    console.log('📋 Step 7: Creating teams...');
    
    const teams = [
      { name: 'U12 Elite Squad', org_index: 0 },
      { name: 'U14 Elite Squad', org_index: 0 },
      { name: 'Sunday Warriors', org_index: 1 },
      { name: 'Sunday Legends', org_index: 1 },
      { name: 'Valley Strikers', org_index: 2 },
      { name: 'Valley Defenders', org_index: 2 }
    ];
    
    for (const team of teams) {
      const org = createdOrgs[team.org_index];
      await client.query(`
        INSERT INTO teams (club_id, name, age_group, sport)
        VALUES ($1, $2, $3, $4)
      `, [org.id, team.name, 'Youth', 'Football']);
      console.log(`  ✓ ${team.name} (${org.name})`);
    }
    
    console.log('\n');
    
    // Commit what we have so far
    await client.query('COMMIT');
    
    // Start new transaction for optional items (staff, listings)
    await client.query('BEGIN');
    
    // ============================================
    // STEP 8: Create Staff for Each Club
    // ============================================
    console.log('📋 Step 8: Creating staff...');
    
    const staffRoles = [
      { role: 'coach', first_name: 'Mike', last_name: 'Johnson' },
      { role: 'assistant_coach', first_name: 'Sarah', last_name: 'Williams' },
      { role: 'physio', first_name: 'James', last_name: 'Brown' }
    ];
    
    let staffCount = 0;
    let staffTableExists = true;
    
    for (const org of createdOrgs) {
      if (!staffTableExists) break;
      
      for (const staff of staffRoles) {
        try {
          await client.query(`
            INSERT INTO staff (club_id, first_name, last_name, role, email)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            org.id, staff.first_name, staff.last_name, staff.role,
            `${staff.first_name.toLowerCase()}.${staff.last_name.toLowerCase()}@${org.name.toLowerCase().replace(/\s+/g, '')}.com`
          ]);
          staffCount++;
        } catch (err) {
          staffTableExists = false;
          await client.query('ROLLBACK');
          await client.query('BEGIN');
          console.log(`  ⚠️  Staff table not available`);
          break;
        }
      }
      if (staffTableExists) {
        console.log(`  ✓ Added staff to ${org.name}`);
      }
    }
    
    if (staffCount > 0) {
      console.log(`  📊 Total staff: ${staffCount}\n`);
    } else {
      console.log('\n');
    }
    
    // ============================================
    // STEP 9: Create Events for Each Club
    // ============================================
    console.log('📋 Step 9: Creating events...');
    
    const eventTypes = ['training', 'match', 'social', 'tournament'];
    let eventCount = 0;
    
    for (const org of createdOrgs) {
      for (let i = 0; i < 5; i++) {
        const daysFromNow = i * 3;
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + daysFromNow);
        
        const eventType = eventTypes[i % eventTypes.length];
        
        await client.query(`
          INSERT INTO events (
            club_id, title, description, event_type, event_date, location, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          org.id,
          `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Session ${i + 1}`,
          `${eventType} for ${org.name} players`,
          eventType,
          eventDate,
          org.location,
          mainUser.id
        ]);
        eventCount++;
      }
      console.log(`  ✓ Created 5 events for ${org.name}`);
    }
    
    console.log(`  📊 Total events: ${eventCount}\n`);
    
    // ============================================
    // STEP 10: Create Recruitment Listings
    // ============================================
    console.log('📋 Step 10: Creating recruitment listings...');
    
    const listings = [
      { position: 'Striker', age_group: 'U12', skill_level: 'Advanced' },
      { position: 'Midfielder', age_group: 'U14', skill_level: 'Intermediate' },
      { position: 'Defender', age_group: 'U10', skill_level: 'Beginner' }
    ];
    
    let listingCount = 0;
    
    for (const org of createdOrgs) {
      for (const listing of listings) {
        try {
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + 30);
          
          await client.query(`
            INSERT INTO listings (
              club_id, title, description, position, age_group,
              skill_level, deadline, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            org.id,
            `${org.name} - ${listing.position} Wanted`,
            `Looking for ${listing.age_group} ${listing.position} players. ${listing.skill_level} level.`,
            listing.position,
            listing.age_group,
            listing.skill_level,
            deadline,
            mainUser.id
          ]);
          listingCount++;
        } catch (err) {
          break;
        }
      }
      if (listingCount > 0) {
        console.log(`  ✓ Created listings for ${org.name}`);
      }
    }
    
    if (listingCount > 0) {
      console.log(`  📊 Total listings: ${listingCount}\n`);
    } else {
      console.log(`  ⚠️  Listings table not available\n`);
    }
    
    await client.query('COMMIT');
    
    // ============================================
    // Summary
    // ============================================
    console.log('✅ Database seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`  • User: ${mainUser.email}`);
    console.log(`  • Organizations: ${createdOrgs.length}`);
    console.log(`  • Your Roles:`);
    console.log(`    - Owner of: Elite Pro Academy`);
    console.log(`    - Player at: Sunday League FC`);
    console.log(`    - Coach at: Valley United`);
    console.log(`  • Your Children: ${createdChildren.length}`);
    console.log(`  • Other Players: ${playerCount}`);
    console.log(`  • Teams: ${teams.length}`);
    console.log(`  • Staff: ${staffCount}`);
    console.log(`  • Events: ${eventCount}`);
    console.log(`  • Listings: ${listingCount}\n`);
    
    console.log('🎯 Test Login:');
    console.log(`  Email: ${mainUser.email}`);
    console.log(`  Password: password123\n`);
    
    console.log('👨‍👩‍👧 Your Family:');
    createdChildren.forEach((child, index) => {
      console.log(`  ${index + 1}. ${child.first_name} ${child.last_name} → ${child.club_name} (${child.position})`);
    });
    
    console.log('\n🎉 Ready to test multi-role system!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

comprehensiveSeed().catch(console.error);
