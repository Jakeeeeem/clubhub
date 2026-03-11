require("dotenv").config();
const { query } = require("./config/database");

async function checkSchema() {
  try {
    const staffCols = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'staff'",
    );
    console.log(
      "Staff columns:",
      staffCols.rows.map((r) => r.column_name),
    );

    const userCols = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'",
    );
    console.log(
      "User columns:",
      userCols.rows.map((r) => r.column_name),
    );
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

checkSchema();
