// run-migration.js — applies the agree_terms columns directly
require("dotenv").config({ path: __dirname + "/.env" });
const { pool } = require("./config/database");

const sql = `
  ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS agree_terms BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS agree_third_party BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS org_types TEXT[] DEFAULT '{}';
`;

pool
  .query(sql)
  .then(() => {
    console.log(
      "✅ Migration applied: agree_terms, agree_third_party, org_types columns added to users",
    );
    return pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position",
    );
  })
  .then((r) => {
    console.log(
      "Current users columns:",
      r.rows.map((x) => x.column_name).join(", "),
    );
    pool.end();
  })
  .catch((err) => {
    console.error("❌ Migration error:", err.message);
    pool.end(process.exit.bind(null, 1));
  });
