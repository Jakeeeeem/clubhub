const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: "127.0.0.1",
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5435,
});

async function runSQL() {
  const sql = fs.readFileSync(
    path.join(__dirname, "migrations/sqls/20260130151500-player-stats-up.sql"),
    "utf-8",
  );
  try {
    await pool.query(sql);
    console.log("Migration executed successfully");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    pool.end();
  }
}

runSQL();
