const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function checkStripeData() {
  try {
    console.log("🔍 Checking Stripe-related data in production...\n");

    // Check organizations with Stripe accounts
    const orgs = await pool.query(`
      SELECT id, name, stripe_account_id, created_at
      FROM organizations
      ORDER BY created_at DESC
    `);

    console.log("📊 ORGANIZATIONS:");
    console.log("═".repeat(80));
    orgs.rows.forEach((org, i) => {
      console.log(`${i + 1}. ${org.name}`);
      console.log(
        `   Stripe Account: ${org.stripe_account_id || "❌ NOT CONNECTED"}`,
      );
      console.log(
        `   Created: ${new Date(org.created_at).toLocaleDateString()}\n`,
      );
    });

    // Check payments
    const payments = await pool.query(`
      SELECT p.*, o.name as org_name, o.stripe_account_id as org_stripe_id
      FROM payments p
      JOIN organizations o ON p.club_id = o.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    console.log("\n💰 RECENT PAYMENTS:");
    console.log("═".repeat(80));
    payments.rows.forEach((pay, i) => {
      console.log(`${i + 1}. ${pay.org_name} - £${pay.amount}`);
      console.log(`   Status: ${pay.payment_status}`);
      console.log(
        `   Stripe Payment Intent: ${pay.stripe_payment_intent_id || "❌ MANUAL/NO ID"}`,
      );
      console.log(
        `   Org Stripe Account: ${pay.org_stripe_id || "❌ NOT CONNECTED"}`,
      );
      console.log(
        `   Created: ${new Date(pay.created_at).toLocaleDateString()}\n`,
      );
    });

    // Summary
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_orgs,
        COUNT(*) FILTER (WHERE stripe_account_id IS NOT NULL) as connected_orgs,
        (SELECT COUNT(*) FROM payments) as total_payments,
        (SELECT COUNT(*) FROM payments WHERE payment_status = 'pending') as pending_payments,
        (SELECT COUNT(*) FROM payments WHERE stripe_payment_intent_id IS NOT NULL) as stripe_payments
      FROM organizations
    `);

    console.log("\n📈 SUMMARY:");
    console.log("═".repeat(80));
    const s = summary.rows[0];
    console.log(`Total Organizations: ${s.total_orgs}`);
    console.log(`Connected to Stripe: ${s.connected_orgs}`);
    console.log(`Total Payments: ${s.total_payments}`);
    console.log(`Pending Payments: ${s.pending_payments}`);
    console.log(`Stripe Payments: ${s.stripe_payments}`);
    console.log(`Manual Payments: ${s.total_payments - s.stripe_payments}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
  }
}

checkStripeData();
