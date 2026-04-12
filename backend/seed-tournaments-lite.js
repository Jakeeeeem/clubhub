const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { pool } = require("./config/database");
const crypto = require("crypto");

async function seedLite() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("🌱 Seeding lite tournament demo...");

    // Find a club to attach the tournament to
    let clubRes = await client.query("SELECT id, name FROM clubs LIMIT 1");
    let clubId;
    let clubName = "Demo Club";
    if (clubRes.rows.length === 0) {
      // Fallback: try organizations
      const orgRes = await client.query(
        "SELECT id, name FROM organizations LIMIT 1",
      );
      if (orgRes.rows.length === 0) {
        throw new Error(
          "No club or organization found to attach tournament to.",
        );
      }
      clubId = orgRes.rows[0].id;
      clubName = orgRes.rows[0].name;
    } else {
      clubId = clubRes.rows[0].id;
      clubName = clubRes.rows[0].name;
    }

    // Find a user to be the creator
    let userRes = await client.query("SELECT id FROM users LIMIT 1");
    let userId;
    if (userRes.rows.length === 0) {
      // create a lightweight admin
      const pw = "$2a$10$uLrP2oYV5h7qH0N3/Vx4RekG8Y5o9yQJv3l8qgYz3j7XG6KkYp1mG";
      const r = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, account_type) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        ["lite-admin@demo.local", pw, "Lite", "Admin", "organization"],
      );
      userId = r.rows[0].id;
    } else {
      userId = userRes.rows[0].id;
    }

    // Create an event as tournament
    const title = `Demo Tournament - ${clubName} (${new Date().toISOString().slice(0, 10)})`;
    const ev = await client.query(
      `INSERT INTO events (title, description, event_type, event_date, event_time, location, price, capacity, spots_available, club_id, created_by) VALUES ($1,$2,'tournament', CURRENT_DATE + 14, '10:00', $3, $4, 64, 64, $5, $6) RETURNING id`,
      [title, "Demo seeded tournament", "Main Ground", 0.0, clubId, userId],
    );
    const eventId = ev.rows[0].id;
    console.log("  ✅ Created event", eventId);

    // Create 8 tournament teams
    const teamNames = [
      "Red Lions",
      "Blue Hawks",
      "Green Rangers",
      "White Eagles",
      "Black Knights",
      "Golden Stars",
      "Silver Arrows",
      "Orange Comets",
    ];
    const teamIds = [];
    for (const tname of teamNames) {
      const r = await client.query(
        `INSERT INTO tournament_teams (event_id, team_name, status) VALUES ($1,$2,'approved') RETURNING id`,
        [eventId, tname],
      );
      teamIds.push(r.rows[0].id);
    }
    console.log("  ✅ Created", teamIds.length, "tournament teams");

    // Create a group stage
    const stageRes = await client.query(
      `INSERT INTO tournament_stages (event_id, name, type, sequence) VALUES ($1,$2,'league',1) RETURNING id`,
      [eventId, "Group Stage"],
    );
    const stageId = stageRes.rows[0].id;

    // Create simple matches (pair up teams)
    const matchPairs = [
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
      [0, 2],
      [1, 3],
      [4, 6],
      [5, 7],
    ];
    for (let i = 0; i < matchPairs.length; i++) {
      const [a, b] = matchPairs[i];
      await client.query(
        `INSERT INTO tournament_matches (stage_id, event_id, home_team_id, away_team_id, round_number, match_number, status) VALUES ($1,$2,$3,$4,1,$5,'scheduled')`,
        [stageId, eventId, teamIds[a], teamIds[b], i + 1],
      );
    }
    console.log("  ✅ Created sample matches");

    await client.query("COMMIT");
    console.log("🏁 Lite tournament seed completed.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Lite seed failed:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) seedLite();
module.exports = { seedLite };
