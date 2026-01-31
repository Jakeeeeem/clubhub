const { Client } = require("pg");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

// Use default env vars or fallback to what we know works
const client = new Client({
  user: process.env.DB_USER || "clubhub_dev_db_user",
  host: "localhost",
  database: process.env.DB_NAME || "clubhub_dev_db",
  password: process.env.DB_PASSWORD || "clubhub_dev_db_password",
  port: 5435,
  ssl: false,
});

async function run() {
  try {
    console.log(`Connecting to localhost:5435...`);
    await client.connect();
    console.log("Connected to database");

    const sql = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS date_of_birth DATE,
      ADD COLUMN IF NOT EXISTS email_recovery_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS auto_payments_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS payment_reminders_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS receipt_emails_enabled BOOLEAN DEFAULT true;
    `;

    await client.query(sql);
    console.log("Successfully added missing columns to users table");
  } catch (err) {
    console.error("Error executing query:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
