const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5436,
  user: "clubhub_dev_db_user",
  password: "hwkX8WjJLKyPRnPrMrBxetxPXRYpBuRQ",
  database: "clubhub_dev_db",
});

const tableName = process.argv[2];

if (!tableName) {
  console.error("Usage: node check_table.js <table_name>");
  process.exit(1);
}

async function check() {
  try {
    const res = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
      [tableName]
    );
    if (res.rows.length === 0) {
      console.log(`Table ${tableName} not found.`);
    } else {
      console.table(res.rows);
    }
    await pool.end();
  } catch (err) {
    console.error("DB Error:", err.message);
    process.exit(1);
  }
}

check();
