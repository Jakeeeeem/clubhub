const { query } = require("./config/database");

async function checkSchema() {
  try {
    const result = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'players'
        `);
    console.log("Columns in 'players' table:");
    result.rows.forEach((row) => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    process.exit(0);
  } catch (err) {
    console.error("Error checking schema:", err);
    process.exit(1);
  }
}

checkSchema();
