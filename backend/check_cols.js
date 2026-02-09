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
    const res = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'invitations'",
    );
    console.table(res.rows);
    await pool.end();
  } catch (err) {
    console.error("DB Error:", err.message);
    process.exit(1);
  }
}

debug();
