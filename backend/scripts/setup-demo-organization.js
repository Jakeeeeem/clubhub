#!/usr/bin/env node

/**
 * Setup Demo Organization
 * Creates a demo organization and assigns demo users with proper roles
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function setupDemoOrganization() {
  console.log('🏢 Setting up Demo Organization');
  console.log('=' .repeat(80));
  console.log('');

  try {
    // Check if demo users exist
    const usersCheck = await pool.query(`
      SELECT email FROM users 
      WHERE email IN ('demo-admin@clubhub.com', 'demo-coach@clubhub.com', 'demo-player@clubhub.com')
    `);

    if (usersCheck.rows.length < 3) {
      console.log('⚠️  Demo users not found. Please create them first:');
      console.log('   - demo-admin@clubhub.com');
      console.log('   - demo-coach@clubhub.com');
      console.log('   - demo-player@clubhub.com');
      console.log('');
      return;
    }

    console.log('✅ Found demo users');
    console.log('');

    // Create demo organization
    console.log('📝 Creating Demo Sports Club...');
    const orgResult = await pool.query(`
      INSERT INTO organizations (
        name,
        slug,
        sport,
        location,
        description,
        owner_id,
        created_at,
        updated_at
      ) VALUES (
        'Demo Sports Club',
        'demo-sports-club',
        'Football',
        'London, UK',
        'Demo organization for testing and demonstrations',
        (SELECT id FROM users WHERE email = 'demo-admin@clubhub.com' LIMIT 1),
        NOW(),
        NOW()
      )
      ON CONFLICT (slug) DO UPDATE
      SET 
        name = EXCLUDED.name,
        updated_at = NOW()
      RETURNING id, name, slug
    `);

    const demoOrg = orgResult.rows[0];
    console.log(`✅ Organization: ${demoOrg.name} (${demoOrg.slug})`);
    console.log(`   ID: ${demoOrg.id}`);
    console.log('');

    // Get user IDs
    const users = await pool.query(`
      SELECT id, email FROM users 
      WHERE email IN ('demo-admin@clubhub.com', 'demo-coach@clubhub.com', 'demo-player@clubhub.com')
    `);

    const userMap = {};
    users.rows.forEach(u => {
      if (u.email.includes('admin')) userMap.admin = u.id;
      if (u.email.includes('coach')) userMap.coach = u.id;
      if (u.email.includes('player')) userMap.player = u.id;
    });

    // Add members
    console.log('👥 Adding members...');

    // Admin as Owner
    await pool.query(`
      INSERT INTO organization_members (
        organization_id, user_id, role, status, joined_at
      ) VALUES ($1, $2, 'owner', 'active', NOW())
      ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = 'owner', status = 'active'
    `, [demoOrg.id, userMap.admin]);
    console.log('   ✅ demo-admin@clubhub.com → Owner');

    // Coach as Coach
    await pool.query(`
      INSERT INTO organization_members (
        organization_id, user_id, role, status, joined_at
      ) VALUES ($1, $2, 'coach', 'active', NOW())
      ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = 'coach', status = 'active'
    `, [demoOrg.id, userMap.coach]);
    console.log('   ✅ demo-coach@clubhub.com → Coach');

    // Player as Player
    await pool.query(`
      INSERT INTO organization_members (
        organization_id, user_id, role, status, joined_at
      ) VALUES ($1, $2, 'player', 'active', NOW())
      ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = 'player', status = 'active'
    `, [demoOrg.id, userMap.player]);
    console.log('   ✅ demo-player@clubhub.com → Player');

    console.log('');

    // Set as default organization
    console.log('⚙️  Setting as default organization...');
    await pool.query(`
      INSERT INTO user_preferences (user_id, current_organization_id)
      VALUES 
        ($1, $4),
        ($2, $4),
        ($3, $4)
      ON CONFLICT (user_id) DO UPDATE
      SET current_organization_id = EXCLUDED.current_organization_id
    `, [userMap.admin, userMap.coach, userMap.player, demoOrg.id]);
    console.log('   ✅ Set as default for all demo users');
    console.log('');

    // Verify
    console.log('');
    console.log('📊 VERIFICATION');
    console.log('=' .repeat(80));
    console.log('');

    const verification = await pool.query(`
      SELECT 
        o.name as organization,
        o.slug,
        u.email,
        om.role,
        om.status,
        up.current_organization_id IS NOT NULL as is_default
      FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      JOIN users u ON om.user_id = u.id
      LEFT JOIN user_preferences up ON u.id = up.user_id AND up.current_organization_id = o.id
      WHERE o.slug = 'demo-sports-club'
      ORDER BY 
        CASE om.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'coach' THEN 3
          WHEN 'player' THEN 4
          ELSE 5
        END
    `);

    verification.rows.forEach((row, index) => {
      console.log(`${(index + 1)}. ${row.email}`);
      console.log(`   Organization: ${row.organization}`);
      console.log(`   Role: ${row.role}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Default Org: ${row.is_default ? 'Yes ✓' : 'No'}`);
      console.log('');
    });

    console.log('');
    console.log('✨ Demo organization setup complete!');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Login as demo-admin@clubhub.com');
    console.log('   2. You should see "Demo Sports Club" in the org switcher');
    console.log('   3. Create payment plans for the organization');
    console.log('   4. Invite more members');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupDemoOrganization();
