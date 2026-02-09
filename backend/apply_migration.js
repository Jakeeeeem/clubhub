const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  host: "localhost",
  port: 5435,
  user: "clubhub_dev_db_user",
  password: "hwkX8WjJLKyPRnPrMrBxetxPXRYpBuRQ",
  database: "clubhub_dev_db",
});

async function runMigration() {
  try {
    const sqlPath = path.join(
      __dirname,
      "migrations",
      "sqls",
      "20260210000000-force-update-invitations-up.sql",
    );
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("🚀 Running migration SQL...");
    await pool.query(sql);
    console.log("✅ Migration successful!");
    await pool.end();
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

runMigration();
