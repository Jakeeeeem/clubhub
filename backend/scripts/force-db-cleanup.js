const { pool } = require("../config/database");

async function cleanup() {
  const client = await pool.connect();
  try {
    console.log("🧹 Starting aggressive database cleanup...");

    // We drop the migrations table as well to force db-migrate to start from zero
    const tables = [
      "migrations",
      "team_players",
      "players",
      "staff",
      "events",
      "event_bookings",
      "match_results",
      "player_ratings",
      "club_applications",
      "availability_responses",
      "payments",
      "tactical_formations",
      "notifications",
      "player_plans",
      "plans",
      "products",
      "product_orders",
      "campaigns",
      "clubs",
      "users",
      "organizations",
      "organization_members",
      "invitations",
      "user_preferences",
      "user_profiles",
    ];

    console.log("⚠️  Dropping all tables...");
    await client.query(`DROP TABLE IF EXISTS ${tables.join(", ")} CASCADE;`);

    console.log("✅ Cleanup complete. Database is now empty.");
  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

cleanup();
