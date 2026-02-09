const { Pool } = require("pg");

// Helper to build connection string from components
function buildConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.PRODUCTION_DATABASE_URL)
    return process.env.PRODUCTION_DATABASE_URL;

  // Fallback to individual variables (Standard for this project)
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || 5432;
  const database = process.env.DB_NAME;

  if (user && host && database) {
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }

  return "postgresql://user:password@host:port/database"; // Final dummy fallback
}

const CONNECTION_STRING = buildConnectionString();

// Log which type we are using (masking secrets)
const isFallback = CONNECTION_STRING.includes("user:password@host");
const source = process.env.DATABASE_URL
  ? "DATABASE_URL"
  : process.env.PRODUCTION_DATABASE_URL
    ? "PRODUCTION_DATABASE_URL"
    : process.env.DB_HOST
      ? "Individual ENV Vars"
      : "FALLBACK (Dummy)";

console.log(`🔌 Connecting to database using: ${source}`);

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
