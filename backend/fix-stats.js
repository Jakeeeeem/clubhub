const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { Pool } = require("pg");

// Override host and port for local terminal execution
const dbConfig = {
  host: "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5435, // Corrected port as per docker-compose.yml
};

const pool = new Pool(dbConfig);

async function fixStats() {
  console.log(
    "🛠️  Force-correcting player stats to 0 (Connecting to localhost:5435)...",
  );

  try {
    const res = await pool.query(
      "UPDATE players SET attendance_rate = 0 WHERE attendance_rate IS NOT NULL AND attendance_rate != 0",
    );
    console.log(`✅ Updated ${res.rowCount} players to 0% attendance.`);

    try {
      const res2 = await pool.query(
        "DELETE FROM player_ratings WHERE rating IS NOT NULL",
      );
      console.log(`✅ Reset ${res2.rowCount} player ratings to 0.`);
    } catch (e) {
      console.log("ℹ️ player_ratings table issue, skipping.");
    }

    try {
      await pool.query(
        "UPDATE players SET goals = 0, assists = 0, matches_played = 0 WHERE (goals IS NOT NULL AND goals != 0) OR (assists IS NOT NULL AND assists != 0) OR (matches_played IS NOT NULL AND matches_played != 0)",
      );
      console.log("✅ Reset custom performance columns on players table.");
    } catch (e) {
      console.log(
        "ℹ️ Custom performance columns don't exist on players table, skipping.",
      );
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to fix stats:", error);
    process.exit(1);
  }
}

fixStats();
