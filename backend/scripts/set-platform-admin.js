#!/usr/bin/env node

/**
 * Set Platform Admin
 * Makes a user a platform administrator
 * 
 * Usage:
 *   node scripts/set-platform-admin.js your-email@example.com
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function setPlatformAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.log('❌ Error: Email address required');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/set-platform-admin.js your-email@example.com');
    console.log('');
    process.exit(1);
  }

  console.log('🔧 Setting Platform Admin');
  console.log('=' .repeat(80));
  console.log('');

  try {
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id, email, first_name, last_name, is_platform_admin FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length === 0) {
      console.log(`❌ User not found: ${email}`);
      console.log('');
      console.log('Please make sure the email address is correct.');
      process.exit(1);
    }

    const user = userCheck.rows[0];

    if (user.is_platform_admin) {
      console.log(`✅ ${email} is already a platform admin`);
      console.log('');
      process.exit(0);
    }

    // Make user platform admin
    await pool.query(
      'UPDATE users SET is_platform_admin = TRUE, updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    console.log('✅ Platform Admin Set Successfully!');
    console.log('');
    console.log('User Details:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.first_name} ${user.last_name}`);
    console.log(`  User ID: ${user.id}`);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('  1. Login as this user');
    console.log('  2. You will be redirected to super-admin-dashboard.html');
    console.log('  3. You can now see all organizations and users');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

setPlatformAdmin();
