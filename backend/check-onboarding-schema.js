const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
process.env.DB_HOST = "localhost";

const { pool } = require("./config/database");

async function checkSchema() {
  try {
    console.log("--- USERS TABLE ---");
    const usersRes = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'",
    );
    usersRes.rows.forEach((r) =>
      console.log(`- ${r.column_name}: ${r.data_type}`),
    );

    console.log("\n--- ORGANIZATIONS TABLE ---");
    const orgsRes = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'organizations'",
    );
    orgsRes.rows.forEach((r) =>
      console.log(`- ${r.column_name}: ${r.data_type}`),
    );
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit();
  }
}

checkSchema();
