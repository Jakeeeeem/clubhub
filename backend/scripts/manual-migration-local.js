const { Client } = require("pg");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const client = new Client({
  user: process.env.DB_USER,
  host: "localhost",
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5435, // Correctly targeting the Docker exposed port
  ssl: false,
});

async function run() {
  try {
    console.log(`Connecting to localhost:5435...`);
    await client.connect();
    console.log("Connected to database");

    const sql =
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;";
    await client.query(sql);
    console.log("Successfully added is_active column to users table");
  } catch (err) {
    console.error("Error executing query:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
