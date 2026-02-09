const { Pool } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

// Helper to build connection string from components (consistent with migrate_production.js)
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

const connectionString = buildConnectionString();

async function checkData() {
  if (!connectionString) {
    console.log("❌ No connection string found");
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("--- PLAYERS ---");
    const players = await pool.query(
      "SELECT id, first_name, last_name, email, club_id, monthly_fee FROM players",
    );
    console.table(players.rows);

    console.log("\n--- INVITATIONS (Pending) ---");
    const invites = await pool.query(
      "SELECT id, first_name, last_name, email, organization_id, status, role FROM invitations WHERE status = 'pending'",
    );
    console.table(invites.rows);

    console.log("\n--- ORGANIZATIONS (Stripe Status) ---");
    const orgs = await pool.query(
      "SELECT id, name, stripe_account_id FROM organizations",
    );
    console.table(orgs.rows);
  } catch (err) {
    console.error("Error querying DB:", err);
  } finally {
    await pool.end();
  }
}

checkData();
