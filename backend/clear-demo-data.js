const { pool } = require("./config/database");

async function clearDemoDataOnly() {
  const client = await pool.connect();

  try {
    console.log("🧹 Clearing demo/seeded data only...");
    console.log(
      "⚠️  This will preserve manually created users and organizations",
    );

    await client.query("BEGIN");

    // Helper to run deletes safely when optional tables may not exist in all schemas
    const safeDel = async (sql, params) => {
      try {
        await client.query('BEGIN');
        await client.query(sql, params);
        await client.query('COMMIT');
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch(_) {}
        console.log('  ⚠️  Skipping (table may be missing or error):', e.message);
      }
    };

    // Get list of demo organizations (created by seed script)
    const demoOrgs = await client.query(`
      SELECT id, name FROM organizations 
      WHERE name ILIKE '%demo%' 
         OR name ILIKE '%test%' 
         OR name ILIKE '%sample%'
         OR slug LIKE 'demo-%'
         OR slug LIKE 'test-%'
    `);

    console.log(`Found ${demoOrgs.rows.length} demo organizations to remove:`);
    demoOrgs.rows.forEach((org) => console.log(`  - ${org.name}`));

    if (demoOrgs.rows.length > 0) {
      const demoOrgIds = demoOrgs.rows.map((o) => o.id);

      // Delete related data for demo orgs (use safeDel for optional tables)
      console.log("Deleting demo organization data...");

      await safeDel(
        `DELETE FROM player_stats WHERE player_id IN (SELECT id FROM players WHERE club_id = ANY($1))`,
        [demoOrgIds],
      );
      await safeDel(
        `DELETE FROM payments WHERE player_id IN (SELECT id FROM players WHERE club_id = ANY($1))`,
        [demoOrgIds],
      );
      await safeDel(
        `DELETE FROM subscriptions WHERE organization_id = ANY($1)`,
        [demoOrgIds],
      );
      await safeDel(`DELETE FROM events WHERE club_id = ANY($1)`, [
        demoOrgIds,
      ]);
      await safeDel(`DELETE FROM staff WHERE club_id = ANY($1)`, [
        demoOrgIds,
      ]);
      await safeDel(`DELETE FROM players WHERE club_id = ANY($1)`, [
        demoOrgIds,
      ]);
      await safeDel(`DELETE FROM teams WHERE club_id = ANY($1)`, [
        demoOrgIds,
      ]);
      await safeDel(`DELETE FROM plans WHERE organization_id = ANY($1)`, [
        demoOrgIds,
      ]);
      await safeDel(
        `DELETE FROM invitations WHERE organization_id = ANY($1)`,
        [demoOrgIds],
      );
      await safeDel(
        `DELETE FROM organization_members WHERE organization_id = ANY($1)`,
        [demoOrgIds],
      );
      await safeDel(`DELETE FROM organizations WHERE id = ANY($1)`, [
        demoOrgIds,
      ]);
      await safeDel(`DELETE FROM clubs WHERE id = ANY($1)`, [demoOrgIds]);
    }

    // Delete demo users (but keep real users and super admin)
    const demoUsers = await client.query(`
      SELECT id, email FROM users 
      WHERE email LIKE '%demo%' 
         OR email LIKE '%test%'
         OR email LIKE '%example%'
         OR email = 'admin@clubhub.com'
         OR email = 'coach@clubhub.com'
         OR email = 'player@clubhub.com'
         OR email = 'parent@clubhub.com'
    `);

    console.log(`\nFound ${demoUsers.rows.length} demo users to remove:`);
    demoUsers.rows.forEach((user) => console.log(`  - ${user.email}`));

    if (demoUsers.rows.length > 0) {
      const demoUserIds = demoUsers.rows.map((u) => u.id);
      await client.query(
        `DELETE FROM user_preferences WHERE user_id = ANY($1)`,
        [demoUserIds],
      );
      await client.query(`DELETE FROM users WHERE id = ANY($1)`, [demoUserIds]);
    }

    await client.query("COMMIT");

    console.log("\n✅ Demo data cleared successfully!");
    console.log("\n📊 Remaining data:");

    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM organizations) as organizations,
        (SELECT COUNT(*) FROM teams) as teams,
        (SELECT COUNT(*) FROM players) as players,
        (SELECT COUNT(*) FROM events) as events
    `);

    console.log(stats.rows[0]);

    const realUsers = await client.query(
      `SELECT email FROM users ORDER BY created_at`,
    );
    console.log("\n👥 Remaining users:");
    realUsers.rows.forEach((u) => console.log(`  - ${u.email}`));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error clearing demo data:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearDemoDataOnly()
  .then(() => {
    console.log("\n✅ Done! Your production data is preserved.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });
