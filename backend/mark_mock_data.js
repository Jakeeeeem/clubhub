const { Pool } = require("pg");

// Check multiple possible environment variable names
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRESQL_URL;

console.log("🔍 Checking environment variables...");
console.log(
  "DATABASE_URL:",
  process.env.DATABASE_URL ? "✅ Set" : "❌ Not set",
);
console.log("DB_URL:", process.env.DB_URL ? "✅ Set" : "❌ Not set");
console.log(
  "POSTGRES_URL:",
  process.env.POSTGRES_URL ? "✅ Set" : "❌ Not set",
);

// If still no URL, try building from individual components
if (!DATABASE_URL) {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  console.log("\n🔧 Trying to build connection string from components:");
  console.log("DB_HOST:", DB_HOST || "❌ Not set");
  console.log("DB_PORT:", DB_PORT || "❌ Not set");
  console.log("DB_USER:", DB_USER || "❌ Not set");
  console.log("DB_PASSWORD:", DB_PASSWORD ? "✅ Set" : "❌ Not set");
  console.log("DB_NAME:", DB_NAME || "❌ Not set");

  if (DB_HOST && DB_USER && DB_PASSWORD && DB_NAME) {
    const port = DB_PORT || "5432";
    const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${port}/${DB_NAME}`;
    console.log("\n✅ Built connection string from components");

    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    runMigration(pool);
  } else {
    console.error(
      "\n❌ Cannot connect to database - missing environment variables!",
    );
    console.error(
      "Please set either DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME",
    );
    process.exit(1);
  }
} else {
  console.log(`\n🔗 Connecting to database...`);

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  runMigration(pool);
}

async function runMigration(pool) {
  try {
    console.log("\n🧹 Marking existing test/mock data in production...\n");

    // 1. Mark test organizations
    const orgs = await pool.query(`
      UPDATE organizations 
      SET is_mock = true 
      WHERE is_mock IS NULL 
        AND (
          name ILIKE '%test%' 
          OR name ILIKE '%demo%' 
          OR name ILIKE '%mock%'
          OR name ILIKE '%333%'
          OR stripe_account_id LIKE 'acct_test%'
        )
      RETURNING id, name
    `);
    console.log(`✅ Marked ${orgs.rowCount} organizations as mock:`);
    orgs.rows.forEach((org) => console.log(`   - ${org.name}`));

    // 2. Mark test users
    const users = await pool.query(`
      UPDATE users 
      SET is_mock = true 
      WHERE is_mock IS NULL 
        AND (
          email ILIKE '%test%' 
          OR email ILIKE '%demo%' 
          OR email ILIKE '%mock%'
          OR email ILIKE '%333%'
        )
      RETURNING id, email
    `);
    console.log(`\n✅ Marked ${users.rowCount} users as mock:`);
    users.rows.forEach((user) => console.log(`   - ${user.email}`));

    // 3. Mark payments from mock organizations
    const payments = await pool.query(`
      UPDATE payments p
      SET is_mock = true
      FROM organizations o
      WHERE p.club_id = o.id 
        AND o.is_mock = true
        AND p.is_mock IS NULL
      RETURNING p.id
    `);
    console.log(`\n✅ Marked ${payments.rowCount} payments as mock`);

    // 4. Mark plans from mock organizations
    const plans = await pool.query(`
      UPDATE plans pl
      SET is_mock = true
      FROM organizations o
      WHERE pl.club_id = o.id 
        AND o.is_mock = true
        AND pl.is_mock IS NULL
      RETURNING pl.id
    `);
    console.log(`✅ Marked ${plans.rowCount} plans as mock`);

    // 5. Show summary
    const summary = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM organizations WHERE is_mock = true) as mock_orgs,
        (SELECT COUNT(*) FROM organizations WHERE is_mock = false OR is_mock IS NULL) as real_orgs,
        (SELECT COUNT(*) FROM users WHERE is_mock = true) as mock_users,
        (SELECT COUNT(*) FROM users WHERE is_mock = false OR is_mock IS NULL) as real_users
    `);

    console.log("\n📊 FINAL SUMMARY:");
    console.log("═".repeat(60));
    const s = summary.rows[0];
    console.log(`Mock Organizations: ${s.mock_orgs}`);
    console.log(`Real Organizations: ${s.real_orgs}`);
    console.log(`Mock Users: ${s.mock_users}`);
    console.log(`Real Users: ${s.real_users}`);

    console.log(
      "\n✅ Done! Refresh your Super Admin dashboard to see clean data.",
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
  }
}
