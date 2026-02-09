const { Pool } = require("pg");

// PRODUCTION DATABASE URL
// Replace this with your actual production DATABASE_URL
// Prioritize standard DATABASE_URL (Render default), then custom, then fallback
const CONNECTION_STRING =
  process.env.DATABASE_URL ||
  process.env.PRODUCTION_DATABASE_URL ||
  "postgresql://user:password@host:port/database";

// Log which type we are using (masking secrets)
const isFallback = CONNECTION_STRING.includes("user:password@host");
console.log(
  `🔌 Connecting to database using: ${
    isFallback ? "FALLBACK (Dummy)" : "ENV Variable"
  }`,
);

const pool = new Pool({
  connectionString: CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false, // Required for most cloud databases
  },
});

async function applyMigration() {
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
}

async function fixInvitationsTable() {
  console.log("🚀 Applying invitations table fix to PRODUCTION database...\n");

  await pool.query(`
      ALTER TABLE invitations 
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS date_of_birth DATE,
      ADD COLUMN IF NOT EXISTS team_id UUID,
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS decline_reason TEXT,
      ADD COLUMN IF NOT EXISTS personal_message TEXT;
    `);

  console.log("✅ Added missing columns to invitations table");
}

async function runAll() {
  try {
    await applyMigration();
    await fixInvitationsTable();
    console.log("\n✅ All Production Migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runAll();
