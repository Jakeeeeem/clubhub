const { Pool } = require("pg");

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
const port = DB_PORT || "5432";
const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${port}/${DB_NAME}`;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function checkData() {
  try {
    console.log("📊 PRODUCTION DATABASE CONTENTS:\n");

    // Organizations
    const orgs = await pool.query(`
      SELECT id, name, stripe_account_id, is_mock, created_at
      FROM organizations
      ORDER BY created_at DESC
    `);

    console.log("🏢 ORGANIZATIONS:");
    console.log("═".repeat(80));
    orgs.rows.forEach((org, i) => {
      console.log(`${i + 1}. ${org.name}`);
      console.log(`   Stripe: ${org.stripe_account_id || "❌ NOT CONNECTED"}`);
      console.log(
        `   is_mock: ${org.is_mock === true ? "✅ MOCK" : org.is_mock === false ? "❌ REAL" : "⚠️  NULL"}`,
      );
      console.log(
        `   Created: ${new Date(org.created_at).toLocaleDateString()}\n`,
      );
    });

    // Payments
    const payments = await pool.query(`
      SELECT p.*, o.name as org_name
      FROM payments p
      JOIN organizations o ON p.club_id = o.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    console.log("\n💰 RECENT PAYMENTS:");
    console.log("═".repeat(80));
    if (payments.rows.length === 0) {
      console.log("No payments found\n");
    } else {
      payments.rows.forEach((pay, i) => {
        console.log(`${i + 1}. ${pay.org_name} - £${pay.amount}`);
        console.log(`   Status: ${pay.payment_status}`);
        console.log(
          `   Stripe Intent: ${pay.stripe_payment_intent_id || "MANUAL"}`,
        );
        console.log(
          `   is_mock: ${pay.is_mock === true ? "✅ MOCK" : pay.is_mock === false ? "❌ REAL" : "⚠️  NULL"}\n`,
        );
      });
    }

    // Summary
    console.log("\n📈 SUMMARY:");
    console.log("═".repeat(80));
    const summary = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE stripe_account_id IS NOT NULL) as connected_orgs,
        COUNT(*) as total_orgs,
        COUNT(*) FILTER (WHERE is_mock = true) as mock_orgs,
        COUNT(*) FILTER (WHERE is_mock = false OR is_mock IS NULL) as real_orgs
      FROM organizations
    `);

    const s = summary.rows[0];
    console.log(`Total Organizations: ${s.total_orgs}`);
    console.log(`Connected to Stripe: ${s.connected_orgs}`);
    console.log(`Mock Organizations: ${s.mock_orgs}`);
    console.log(`Real Organizations: ${s.real_orgs}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
  }
}

checkData();
