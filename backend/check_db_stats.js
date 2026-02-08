const { Pool } = require("pg");
require("dotenv").config({ path: "./backend/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  const result = await pool.query(`
    SELECT 
        (SELECT COUNT(*) FROM organizations WHERE stripe_account_id IS NOT NULL) as connected_orgs,
        (SELECT COUNT(*) FROM organizations) as total_orgs,
        (SELECT COUNT(*) FROM plans) as total_plans
  `);
  console.log(JSON.stringify(result.rows[0], null, 2));
  process.exit(0);
}

check();
