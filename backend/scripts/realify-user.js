#!/usr/bin/env node
// realify-user.js
// Usage: node backend/scripts/realify-user.js email password

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { query, connectDB } = require('../config/database');

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node backend/scripts/realify-user.js email password');
    process.exit(2);
  }

  try {
    await connectDB();
    const userRes = await query('SELECT id, email, account_type, is_mock FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      console.error('User not found:', email);
      process.exit(3);
    }

    const user = userRes.rows[0];
    const hash = await bcrypt.hash(password, 12);

    const updateRes = await query(
      `UPDATE users SET password_hash = $1, account_type = 'organization', email_verified = true, is_mock = false, updated_at = NOW() WHERE id = $2 RETURNING id, email, account_type, email_verified, is_mock`,
      [hash, user.id]
    );

    console.log('Updated user:', updateRes.rows[0]);

    // Ensure user has an organization_members owner row for any organizations they own
    const orgs = await query('SELECT id FROM organizations WHERE owner_id = $1', [user.id]);
    if (orgs.rows.length > 0) {
      for (const o of orgs.rows) {
        // Upsert organization_members as owner
        await query(
          `INSERT INTO organization_members (user_id, organization_id, role, status, joined_at)
           VALUES ($1, $2, 'owner', 'active', NOW())
           ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'owner', status = 'active', updated_at = NOW()`,
          [user.id, o.id]
        );
        console.log('Ensured owner membership for org:', o.id);
      }
    }

    console.log('Real account setup complete for', email);
    process.exit(0);
  } catch (err) {
    console.error('Error realifying user:', err);
    process.exit(1);
  }
}

main();
