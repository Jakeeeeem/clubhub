const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = path.join(__dirname, ".env");
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const pool = new Pool({
  host: "localhost",
  user: envConfig.DB_USER || "clubhub_dev_db_user",
  password: String(envConfig.DB_PASSWORD || "hwkX8WjJLKyPRnPrMrBxetxPXRYpBuRQ"),
  database: envConfig.DB_NAME || "clubhub_dev_db",
  port: 5435, // From docker-compose
});

async function run() {
  try {
    const upSql = fs.readFileSync(
      path.join(__dirname, "migrations/sqls/20260208000000-add-is-mock-up.sql"),
      "utf8",
    );
    await pool.query(upSql);
    console.log("✅ Migration applied successfully");
  } catch (e) {
    console.error("❌ Migration failed:", e);
  } finally {
    pool.end();
  }
}
run();
