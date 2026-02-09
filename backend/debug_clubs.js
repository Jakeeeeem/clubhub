const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5435,
  user: "clubhub_dev_db_user",
  password: "hwkX8WjJLKyPRnPrMrBxetxPXRYpBuRQ",
  database: "clubhub_dev_db",
});

async function debug() {
  try {
    console.log("--- CLUBS ---");
    const clubs = await pool.query("SELECT id, name FROM organizations");
    console.table(clubs.rows);
    await pool.end();
  } catch (err) {
    console.error("DB Error:", err.message);
    process.exit(1);
  }
}

debug();
