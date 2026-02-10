require("dotenv").config();
process.env.DB_HOST = "localhost";
const { query } = require("./config/database");

async function migrate() {
  try {
    console.log("Migrating plans table...");

    await query(`
      ALTER TABLE plans 
      ADD COLUMN IF NOT EXISTS billing_anchor_type VARCHAR(50) DEFAULT 'signup_date',
      ADD COLUMN IF NOT EXISTS billing_anchor_day INTEGER
    `);

    console.log("✅ Plans table updated successfully.");

    // Quick check on Stripe status for user context
    console.log("Checking Stripe Status for context...");
    const orgs = await query(
      "SELECT id, name, stripe_account_id FROM organizations",
    );
    console.log("Organizations:", orgs.rows);

    process.exit(0);
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }
}

migrate();
