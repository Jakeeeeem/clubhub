const { Pool } = require("pg");

// PRODUCTION DATABASE URL
// Replace this with your actual production DATABASE_URL
const PRODUCTION_DATABASE_URL =
  process.env.PRODUCTION_DATABASE_URL ||
  "postgresql://user:password@host:port/database";

const pool = new Pool({
  connectionString: PRODUCTION_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for most cloud databases
  },
});

async function applyMigration() {
  try {
    console.log("🚀 Applying is_mock migration to PRODUCTION database...\n");

    // Add is_mock column to users
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT false;
    `);
    console.log("✅ Added is_mock to users");

    // Add is_mock column to organizations
    await pool.query(`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT false;
    `);
    console.log("✅ Added is_mock to organizations");

    // Add is_mock column to plans
    await pool.query(`
      ALTER TABLE plans 
      ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT false;
    `);
    console.log("✅ Added is_mock to plans");

    // Add is_mock column to payments
    await pool.query(`
      ALTER TABLE payments 
      ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT false;
    `);
    console.log("✅ Added is_mock to payments");

    // Add is_mock column to clubs (if table exists)
    try {
      await pool.query(`
        ALTER TABLE clubs 
        ADD COLUMN IF NOT EXISTS is_mock BOOLEAN DEFAULT false;
      `);
      console.log("✅ Added is_mock to clubs");
    } catch (err) {
      console.log("ℹ️  clubs table does not exist, skipping");
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

applyMigration();
