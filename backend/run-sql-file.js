const path = require("path");
const fs = require("fs");

// Load backend .env
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { pool } = require("./config/database");

async function run() {
  const relPath = process.argv[2];
  if (!relPath) {
    console.error(
      "Usage: node run-sql-file.js <relative-path-to-sql-file-within-backend>",
    );
    process.exit(1);
  }

  const sqlPath = path.isAbsolute(relPath)
    ? relPath
    : path.join(__dirname, relPath);

  if (!fs.existsSync(sqlPath)) {
    console.error("SQL file not found:", sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");

  try {
    console.log("Applying SQL file:", sqlPath);
    await pool.query(sql);
    console.log("✅ SQL executed successfully.");
  } catch (err) {
    console.error("❌ Error executing SQL:", err);
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch (e) {
      // ignore
    }
  }
}

run();
