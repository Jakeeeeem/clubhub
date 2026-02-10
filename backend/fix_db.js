require("dotenv").config();
const { Client } = require("pg");

// Configuration: prioritizes DATABASE_URL if you have a full connection string (like from Render)
const dbConfig = process.env.DATABASE_URL || {
  host:
    process.env.DB_HOST === "db"
      ? "localhost"
      : process.env.DB_HOST || "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : process.env.DB_SSL === "true"
      ? { rejectUnauthorized: false }
      : false,
};

async function run() {
  console.log("🚀 Starting database schema update...");
  console.log(
    `📡 Connecting to: ${typeof dbConfig === "string" ? "DATABASE_URL" : dbConfig.host}`,
  );

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log("✅ Connected to database.");

    console.log(
      "🛠️ Adding missing Stripe and Billing columns to 'plans' table...",
    );

    // Add all required columns for Stripe integration if they don't exist
    await client.query(`
      ALTER TABLE plans 
      ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS billing_anchor_type VARCHAR(50) DEFAULT 'signup_date',
      ADD COLUMN IF NOT EXISTS billing_anchor_day INTEGER;
    `);

    console.log(
      "✨ SUCCESS: All columns added/verified. You can now create payment plans.",
    );
  } catch (err) {
    console.error("❌ ERROR running script:", err.message);
    if (err.message.includes("ECONNREFUSED")) {
      console.log(
        "\n💡 TIP: If you are running this locally and your DB is in Docker, try changing DB_HOST to 'localhost' in your .env or just run: DB_HOST=localhost node fix_db.js",
      );
    }
  } finally {
    await client.end();
    console.log("👋 Script finished.");
    process.exit(0);
  }
}

run();
