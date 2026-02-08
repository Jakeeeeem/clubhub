const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = path.join(__dirname, ".env");
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const pool = new Pool({
  host: "localhost",
  user: envConfig.DB_USER,
  password: String(envConfig.DB_PASSWORD),
  database: envConfig.DB_NAME,
  port: parseInt(envConfig.DB_PORT || "5432"),
});

async function check() {
  try {
    const res = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'organizations'",
    );
    console.log(res.rows.map((r) => r.column_name).join(","));
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
