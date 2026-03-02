require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5436,
});

async function run() {
  try {
    const sqlPath = path.join(
      __dirname,
      "scripts",
      "create-tactical-table.sql",
    );
    const sql = fs.readFileSync(sqlPath, "utf8");
    await pool.query(sql);
    console.log("✅ Tactical formations table created successfully");
  } catch (err) {
    console.error("❌ Error creating table:", err);
  } finally {
    await pool.end();
  }
}

run();
