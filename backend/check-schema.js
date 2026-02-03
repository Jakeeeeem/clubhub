const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
// Override DB_HOST for local run
process.env.DB_HOST = "localhost";

const { pool } = require("./config/database");

async function checkSchema() {
  try {
    console.log("Connecting to:", process.env.DB_HOST, process.env.DB_NAME);
    const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'organizations'
        `);
    console.log("Columns for organizations:");
    res.rows.forEach((row) =>
      console.log(`- ${row.column_name}: ${row.data_type}`),
    );

    const res2 = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'clubs'
        `);
    console.log("\nColumns for clubs:");
    res2.rows.forEach((row) =>
      console.log(`- ${row.column_name}: ${row.data_type}`),
    );
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    process.exit();
  }
}
checkSchema();
