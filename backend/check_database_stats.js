const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = path.join(__dirname, ".env");
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const pool = new Pool({
  host: "localhost",
  user: envConfig.DB_USER || "clubhub_dev_db_user",
  password: String(envConfig.DB_PASSWORD || "hwkX8WjJLKyPRnPrMrBxetxPXRYpBuRQ"),
  database: envConfig.DB_NAME || "clubhub_dev_db",
  port: 5435, // From docker-compose
});

async function checkDatabase() {
  try {
    console.log("🔍 Checking Database Stats...\n");

    // Check if is_mock column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'organizations' AND column_name = 'is_mock'
    `);

    const hasMockColumn = columnCheck.rows.length > 0;
    console.log(`✅ is_mock column exists: ${hasMockColumn ? "YES" : "NO"}\n`);

    // Get organization stats
    console.log("📊 ORGANIZATION STATS:");
    console.log("═".repeat(60));

    const orgStats = await pool.query(`
      SELECT 
        COUNT(*) as total_orgs,
        COUNT(*) FILTER (WHERE stripe_account_id IS NOT NULL) as connected_orgs,
        COUNT(*) FILTER (WHERE stripe_account_id IS NULL) as not_connected_orgs
        ${hasMockColumn ? ", COUNT(*) FILTER (WHERE is_mock = true) as mock_orgs" : ""}
        ${hasMockColumn ? ", COUNT(*) FILTER (WHERE is_mock = false OR is_mock IS NULL) as real_orgs" : ""}
      FROM organizations
    `);

    const stats = orgStats.rows[0];
    console.log(`Total Organizations: ${stats.total_orgs}`);
    console.log(`Connected to Stripe: ${stats.connected_orgs}`);
    console.log(`Not Connected: ${stats.not_connected_orgs}`);
    if (hasMockColumn) {
      console.log(`Mock Organizations: ${stats.mock_orgs}`);
      console.log(`Real Organizations: ${stats.real_orgs}`);
    }

    const connectedPercent =
      stats.total_orgs > 0
        ? Math.round((stats.connected_orgs / stats.total_orgs) * 100)
        : 0;
    console.log(`Connection Rate: ${connectedPercent}%\n`);

    // List all organizations with details
    console.log("📋 ORGANIZATION DETAILS:");
    console.log("═".repeat(60));

    const orgs = await pool.query(`
      SELECT 
        id, 
        name, 
        stripe_account_id,
        created_at
        ${hasMockColumn ? ", is_mock" : ""}
      FROM organizations
      ORDER BY created_at DESC
    `);

    if (orgs.rows.length === 0) {
      console.log("No organizations found in database.\n");
    } else {
      orgs.rows.forEach((org, index) => {
        console.log(`\n${index + 1}. ${org.name}`);
        console.log(`   ID: ${org.id}`);
        console.log(
          `   Stripe Account: ${org.stripe_account_id || "NOT CONNECTED"}`,
        );
        console.log(
          `   Created: ${new Date(org.created_at).toLocaleDateString()}`,
        );
        if (hasMockColumn) {
          console.log(`   Is Mock: ${org.is_mock ? "YES" : "NO"}`);
        }
      });
    }

    // User stats
    console.log("\n\n👥 USER STATS:");
    console.log("═".repeat(60));

    const userStats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE account_type = 'organization') as org_users,
        COUNT(*) FILTER (WHERE is_platform_admin = true) as platform_admins
        ${hasMockColumn ? ", COUNT(*) FILTER (WHERE is_mock = true) as mock_users" : ""}
        ${hasMockColumn ? ", COUNT(*) FILTER (WHERE is_mock = false OR is_mock IS NULL) as real_users" : ""}
      FROM users
    `);

    const uStats = userStats.rows[0];
    console.log(`Total Users: ${uStats.total_users}`);
    console.log(`Organization Users: ${uStats.org_users}`);
    console.log(`Platform Admins: ${uStats.platform_admins}`);
    if (hasMockColumn) {
      console.log(`Mock Users: ${uStats.mock_users}`);
      console.log(`Real Users: ${uStats.real_users}`);
    }

    // Plans stats
    console.log("\n\n💰 PAYMENT PLAN STATS:");
    console.log("═".repeat(60));

    const planStats = await pool.query(`
      SELECT 
        COUNT(*) as total_plans,
        COUNT(*) FILTER (WHERE active = true) as active_plans
        ${hasMockColumn ? ", COUNT(*) FILTER (WHERE is_mock = true) as mock_plans" : ""}
        ${hasMockColumn ? ", COUNT(*) FILTER (WHERE is_mock = false OR is_mock IS NULL) as real_plans" : ""}
      FROM plans
    `);

    const pStats = planStats.rows[0];
    console.log(`Total Plans: ${pStats.total_plans}`);
    console.log(`Active Plans: ${pStats.active_plans}`);
    if (hasMockColumn) {
      console.log(`Mock Plans: ${pStats.mock_plans}`);
      console.log(`Real Plans: ${pStats.real_plans}`);
    }

    // Expected Super Admin Dashboard Display
    console.log("\n\n🎯 EXPECTED SUPER ADMIN DASHBOARD (includeMock=false):");
    console.log("═".repeat(60));
    if (hasMockColumn) {
      console.log(`Total Organizations: ${stats.real_orgs}`);
      console.log(
        `Connected to Stripe: ${stats.connected_orgs} (filtering out mock orgs)`,
      );
      console.log(`Total Users: ${uStats.real_users}`);
      console.log(`Active Plans: ${pStats.real_plans}`);
    } else {
      console.log(`Total Organizations: ${stats.total_orgs}`);
      console.log(`Connected to Stripe: ${stats.connected_orgs}`);
      console.log(`Total Users: ${uStats.total_users}`);
      console.log(`Active Plans: ${pStats.active_plans}`);
    }

    console.log("\n✅ Database check complete!\n");
  } catch (error) {
    console.error("❌ Error checking database:", error);
  } finally {
    await pool.end();
  }
}

checkDatabase();
