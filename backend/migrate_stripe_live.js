const { Pool } = require("pg");
require("dotenv").config();

/**
 * PRODUCTION MIGRATION SCRIPT
 * Specifically for adding Stripe and Billing Anchor columns to the 'plans' table.
 * Uses DATABASE_URL or component variables with SSL enabled.
 */

function buildConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.PRODUCTION_DATABASE_URL)
    return process.env.PRODUCTION_DATABASE_URL;

  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || 5432;
  const database = process.env.DB_NAME;

  if (user && host && database) {
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }
  return null;
}

const CONNECTION_STRING = buildConnectionString();

if (!CONNECTION_STRING) {
  console.error(
    "❌ ERROR: No database connection information found in environment variables (DATABASE_URL, DB_HOST, etc.)",
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false, // Required for Render/Cloud DBs
  },
});

async function runMigration() {
  console.log("🚀 Starting LIVE Stripe Schema Migration...");
  console.log(
    `🔌 Destination: ${CONNECTION_STRING.split("@")[1] || "Unknown Host"}`,
  );

  try {
    const start = Date.now();

    // 1. Update 'plans' table
    console.log(
      "🛠️  Updating 'plans' table with Stripe and Billing columns...",
    );
    await pool.query(`
      ALTER TABLE plans 
      ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS billing_anchor_type VARCHAR(50) DEFAULT 'signup_date',
      ADD COLUMN IF NOT EXISTS billing_anchor_day INTEGER;
    `);
    console.log("✅ 'plans' table updated.");

    // 2. Verification
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'plans' 
      AND column_name IN ('stripe_product_id', 'stripe_price_id', 'billing_anchor_type', 'billing_anchor_day');
    `);

    console.log(
      `✨ Migration Complete! (${res.rowCount} columns verified in ${Date.now() - start}ms)`,
    );
    console.log("👉 You can now create payment plans on the live site.");
  } catch (err) {
    console.error("❌ MIGRATION FAILED:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
