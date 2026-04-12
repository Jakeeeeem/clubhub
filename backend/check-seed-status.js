const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { pool } = require("./config/database");

async function check() {
  try {
    console.log("\n🔎 Checking seed status...");

    const q = async (sql, label) => {
      try {
        const r = await pool.query(sql);
        console.log(`\n-- ${label}:`);
        console.log(JSON.stringify(r.rows, null, 2));
      } catch (e) {
        console.log(`\n-- ${label} (error):`, e.message);
      }
    };

    await q("SELECT count(*) as cnt FROM tournaments", "Tournaments count");
    await q(
      "SELECT id, name, start_date, status FROM tournaments ORDER BY created_at DESC LIMIT 5",
      "Recent tournaments (sample)",
    );

    await q("SELECT count(*) as cnt FROM events", "Events count");
    await q(
      "SELECT id, title, event_type, event_date FROM events WHERE event_type='tournament' ORDER BY event_date DESC LIMIT 10",
      "Recent event-type=tournament (sample)",
    );

    await q("SELECT count(*) as cnt FROM organizations", "Organizations count");
    await q("SELECT count(*) as cnt FROM clubs", "Clubs count");
    await q("SELECT count(*) as cnt FROM teams", "Teams count");
    await q("SELECT count(*) as cnt FROM players", "Players count");

    console.log("\n✅ DB check finished.");
  } catch (err) {
    console.error("❌ Check failed:", err.message);
  } finally {
    await pool.end();
  }
}

check();
