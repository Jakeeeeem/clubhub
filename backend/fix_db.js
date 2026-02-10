require("dotenv").config();
const { Client } = require("pg");

// Force localhost for script execution if running outside Docker
const dbConfig = {
  host: "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "5432"),
};

async function run() {
  const client = new Client(dbConfig);

  // Set a short timeout for the connection
  const timer = setTimeout(() => {
    console.error(
      "❌ Connection Timeout: Could not connect to database at localhost:5432 within 5 seconds.",
    );
    process.exit(1);
  }, 5000);

  try {
    console.log("🔗 Connecting to database at localhost...");
    await client.connect();
    clearTimeout(timer);
    console.log("✅ Connected.");

    console.log("🛠️ Running migration query...");
    await client.query(`
      ALTER TABLE plans 
      ADD COLUMN IF NOT EXISTS billing_anchor_type VARCHAR(50) DEFAULT 'signup_date',
      ADD COLUMN IF NOT EXISTS billing_anchor_day INTEGER;
    `);

    console.log("✨ SUCCESS: Columns added/verified.");
  } catch (err) {
    console.error("❌ ERROR:", err.message);
  } finally {
    await client.end();
    console.log("👋 Script finished.");
    process.exit(0);
  }
}

run();
