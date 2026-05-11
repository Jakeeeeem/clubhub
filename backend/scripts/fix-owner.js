#!/usr/bin/env node
// Fix owner script for local development
// Usage: node backend/scripts/fix-owner.js user@example.com [orgId]

const { query, withTransaction, queries, connectDB } = require('../config/database');

async function main() {
  const email = process.argv[2];
  const orgIdArg = process.argv[3];

  if (!email) {
    console.error('Usage: node backend/scripts/fix-owner.js user@example.com [orgId]');
    process.exit(2);
  }

  try {
    await connectDB();

    // Find user by email
    const userRes = await query(queries.findUserByEmail, [email]);
    if (userRes.rows.length === 0) {
      console.error('User not found for email:', email);
      process.exit(3);
    }

    const user = userRes.rows[0];
    console.log('Found user:', user.id, user.email);

    // Determine target organizations
    let orgIds = [];

    if (orgIdArg) {
      orgIds = [orgIdArg];
    } else {
      // Find organizations where the user is a member (organization_members)
      const memb = await query(
        'SELECT DISTINCT organization_id FROM organization_members WHERE user_id = $1',
        [user.id]
      );
      const staff = await query(
        'SELECT DISTINCT club_id as organization_id FROM staff WHERE user_id = $1',
        [user.id]
      );

      orgIds = Array.from(new Set([...(memb.rows.map(r => r.organization_id)), ...(staff.rows.map(r => r.organization_id))].filter(Boolean)));
    }

    if (orgIds.length === 0) {
      console.error('No organizations found for this user. Provide an orgId as the second argument to force the change.');
      process.exit(4);
    }

    console.log('Target organizations to update owner:', orgIds.join(', '));

    // Apply updates in a transaction per org
    for (const orgId of orgIds) {
      await withTransaction(async (client) => {
        const cur = await client.query('SELECT id, owner_id, name FROM organizations WHERE id = $1 FOR UPDATE', [orgId]);
        if (cur.rows.length === 0) {
          console.warn('Organization not found:', orgId);
          return;
        }

        const org = cur.rows[0];
        if (String(org.owner_id) === String(user.id)) {
          console.log(`Organization ${orgId} already owned by user ${user.id}`);
          return;
        }

        console.log(`Updating organization ${orgId} (${org.name}) owner from ${org.owner_id} -> ${user.id}`);
        await client.query('UPDATE organizations SET owner_id = $1, updated_at = NOW() WHERE id = $2', [user.id, orgId]);
      });
    }

    console.log('Owner fix complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error running fix-owner:', err.message || err);
    process.exit(1);
  }
}

main();
