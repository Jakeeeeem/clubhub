const { Pool } = require("pg");

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
const port = DB_PORT || "5432";
const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${port}/${DB_NAME}`;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function markTestData() {
  try {
    console.log("🧹 Marking test data as mock...\n");

    // Mark specific test organizations by name
    const testOrgNames = [
      "test333sdfdf",
      "Pro Club Demo",
      "Legacy Recovered Organization",
    ];

    for (const orgName of testOrgNames) {
      const result = await pool.query(
        `
        UPDATE organizations 
        SET is_mock = true 
        WHERE name = $1
        RETURNING id, name
      `,
        [orgName],
      );

      if (result.rowCount > 0) {
        console.log(
          `✅ Marked "${orgName}" as mock (${result.rowCount} org(s))`,
        );
      }
    }

    // Mark payments from mock organizations
    const payments = await pool.query(`
      UPDATE payments p
      SET is_mock = true
      FROM organizations o
      WHERE p.club_id = o.id 
        AND o.is_mock = true
      RETURNING p.id, p.amount
    `);
    console.log(`\n✅ Marked ${payments.rowCount} payment(s) as mock`);

    // Mark plans from mock organizations
    const plans = await pool.query(`
      UPDATE plans pl
      SET is_mock = true
      FROM organizations o
      WHERE pl.club_id = o.id 
        AND o.is_mock = true
      RETURNING pl.id
    `);
    console.log(`✅ Marked ${plans.rowCount} plan(s) as mock`);

    // Mark users associated with mock organizations
    const users = await pool.query(`
      UPDATE users u
      SET is_mock = true
      FROM organization_members om
      JOIN organizations o ON om.organization_id = o.id
      WHERE u.id = om.user_id
        AND o.is_mock = true
        AND u.is_mock = false
      RETURNING u.id, u.email
    `);
    console.log(`✅ Marked ${users.rowCount} user(s) as mock`);

    // Show final summary
    const summary = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE stripe_account_id IS NOT NULL AND (is_mock = false OR is_mock IS NULL)) as real_connected_orgs,
        COUNT(*) FILTER (WHERE is_mock = false OR is_mock IS NULL) as real_orgs,
        COUNT(*) FILTER (WHERE is_mock = true) as mock_orgs
      FROM organizations
    `);

    console.log("\n📊 FINAL SUMMARY:");
    console.log("═".repeat(60));
    const s = summary.rows[0];
    console.log(`Real Organizations: ${s.real_orgs}`);
    console.log(`Mock Organizations: ${s.mock_orgs}`);
    console.log(`Real Connected to Stripe: ${s.real_connected_orgs}`);

    console.log("\n✅ Done! Refresh your Super Admin dashboard.");
    console.log("Expected to see:");
    console.log(`  - ${s.real_connected_orgs} Connected Clubs`);
    console.log(`  - ${s.real_orgs} Total Organizations`);
    console.log(`  - No test payments`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
  }
}

markTestData();
