const { pool } = require("./config/database");

async function clearMockData() {
  const client = await pool.connect();

  try {
    console.log("🧹 Starting to clear mock data...");

    await client.query("BEGIN");

    // Delete in order to respect foreign key constraints
    console.log("Deleting player stats...");
    await client.query("DELETE FROM player_stats");

    console.log("Deleting payments...");
    await client.query("DELETE FROM payments");

    console.log("Deleting subscriptions...");
    await client.query("DELETE FROM subscriptions");

    console.log("Deleting events...");
    await client.query("DELETE FROM events");

    console.log("Deleting staff...");
    await client.query("DELETE FROM staff");

    console.log("Deleting players...");
    await client.query("DELETE FROM players");

    console.log("Deleting teams...");
    await client.query("DELETE FROM teams");

    console.log("Deleting plans...");
    await client.query("DELETE FROM plans");

    console.log("Deleting invitations...");
    await client.query("DELETE FROM invitations");

    console.log("Deleting organization members...");
    await client.query("DELETE FROM organization_members");

    console.log("Deleting organizations...");
    await client.query("DELETE FROM organizations");

    console.log("Deleting clubs (legacy)...");
    await client.query("DELETE FROM clubs");

    console.log("Deleting user preferences...");
    await client.query("DELETE FROM user_preferences");

    console.log("Deleting users (except super admin)...");
    await client.query(
      `DELETE FROM users WHERE email != 'superadmin@clubhub.com'`,
    );

    await client.query("COMMIT");

    console.log("✅ Mock data cleared successfully!");
    console.log("");
    console.log("Remaining data:");

    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM organizations) as organizations,
        (SELECT COUNT(*) FROM teams) as teams,
        (SELECT COUNT(*) FROM players) as players,
        (SELECT COUNT(*) FROM events) as events
    `);

    console.log(stats.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error clearing mock data:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearMockData()
  .then(() => {
    console.log("✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });
