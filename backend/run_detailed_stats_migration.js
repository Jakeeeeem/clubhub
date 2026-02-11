const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function runMigration() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: "localhost", // Override for local execution
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  const sqlPath = path.join(
    __dirname,
    "migrations",
    "sqls",
    "20260211163000-detailed-player-stats-up.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");

  try {
    console.log("Running migration...");
    await pool.query(sql);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

runMigration();
