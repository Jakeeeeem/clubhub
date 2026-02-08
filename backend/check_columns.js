const { Pool } = require("pg");
require("dotenv").config({ path: "./backend/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  const result = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'organizations'
  `);
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}

check();
