#!/usr/bin/env node
/* scripts/seed-camps.js
   Seed demo camps, groups, bibs, players and bookings.
   Usage: set DATABASE_* env vars or use .env then run: node scripts/seed-camps.js
*/
const path = require("path");
const {
  query,
  withTransaction,
  connectDB,
} = require("../backend/config/database");

async function ensureDemo() {
  await connectDB();

  return await withTransaction(async (client) => {
    // 1. Find or create owner user
    let userRes = await client.query("SELECT id, email FROM users LIMIT 1");
    let ownerId;
    if (userRes.rows.length === 0) {
      const email = `seed-owner+${Date.now()}@example.com`;
      const pw = "seeded";
      const insertUser = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, account_type) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [email, pw, "Seed", "Owner", "organization"],
      );
      ownerId = insertUser.rows[0].id;
      console.log("Created demo user", email);
    } else {
      ownerId = userRes.rows[0].id;
      console.log("Using existing user", userRes.rows[0].email);
    }

    // 2. Find or create a club
    let clubRes = await client.query("SELECT id, name FROM clubs LIMIT 1");
    let clubId;
    if (clubRes.rows.length === 0) {
      const club = await client.query(
        `INSERT INTO clubs (name, types, sport, owner_id) VALUES ($1,$2,$3,$4) RETURNING id`,
        ["Seed Club", ["club", "event"], "football", ownerId],
      );
      clubId = club.rows[0].id;
      console.log("Created demo club", clubId);
    } else {
      clubId = clubRes.rows[0].id;
      console.log("Using existing club", clubRes.rows[0].name);
    }

    // 3. Create sample players (if not present for this club)
    const playersExist = await client.query(
      "SELECT id FROM players WHERE club_id = $1 LIMIT 1",
      [clubId],
    );
    let playerIds = [];
    if (playersExist.rows.length === 0) {
      for (let i = 1; i <= 4; i++) {
        const p = await client.query(
          `INSERT INTO players (first_name,last_name,email,date_of_birth,club_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [
            `Demo${i}`,
            "Player",
            `demo${i}@example.com`,
            "2010-01-0" + i,
            clubId,
          ],
        );
        playerIds.push(p.rows[0].id);
      }
      console.log("Created players:", playerIds.join(", "));
    } else {
      const existing = await client.query(
        "SELECT id FROM players WHERE club_id = $1 LIMIT 4",
        [clubId],
      );
      playerIds = existing.rows.map((r) => r.id);
      console.log("Found existing players:", playerIds.join(", "));
    }

    // 4. Create a camp event
    const eventRes = await client.query(
      `INSERT INTO events (title, description, event_type, event_date, event_time, location, price, capacity, spots_available, club_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        "Seed Summer Camp",
        "Demo campus seeded by script",
        "camp",
        new Date().toISOString().split("T")[0],
        "09:00:00",
        "Main Ground",
        49.0,
        200,
        200,
        clubId,
        ownerId,
      ],
    );
    const eventId = eventRes.rows[0].id;
    console.log("Created camp event", eventId);

    // 5. Create groups
    const groupA = await client.query(
      "INSERT INTO camp_groups (event_id, name, coach_id) VALUES ($1,$2,$3) RETURNING id",
      [eventId, "Group A", null],
    );
    const groupB = await client.query(
      "INSERT INTO camp_groups (event_id, name, coach_id) VALUES ($1,$2,$3) RETURNING id",
      [eventId, "Group B", null],
    );
    const groupAId = groupA.rows[0].id;
    const groupBId = groupB.rows[0].id;
    console.log("Created camp groups", groupAId, groupBId);

    // 6. Register players to event (event_players) and assign groups/bibs/bookings
    for (let i = 0; i < playerIds.length; i++) {
      const pid = playerIds[i];
      await client.query(
        "INSERT INTO event_players (event_id, player_id, assigned_at) VALUES ($1,$2,NOW()) ON CONFLICT DO NOTHING",
        [eventId, pid],
      );
      const assignGroup = i % 2 === 0 ? groupAId : groupBId;
      await client.query(
        "UPDATE event_players SET group_id = $1 WHERE event_id = $2 AND player_id = $3",
        [assignGroup, eventId, pid],
      );
      // Bib numbers
      await client.query(
        `INSERT INTO camp_bibs (event_id, player_id, bib_number, bib_color) VALUES ($1,$2,$3,$4) ON CONFLICT (event_id, bib_number) DO UPDATE SET player_id = EXCLUDED.player_id, bib_color = EXCLUDED.bib_color`,
        [eventId, pid, i + 10, i % 2 === 0 ? "red" : "blue"],
      );
      // Booking (link to owner user)
      await client.query(
        `INSERT INTO event_bookings (event_id, user_id, player_id, booking_status, payment_status, amount_paid, booked_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT DO NOTHING`,
        [eventId, ownerId, pid, "confirmed", "paid", 49.0],
      );
    }

    return { eventId, clubId, playerIds, groups: [groupAId, groupBId] };
  });
}

ensureDemo()
  .then((r) => {
    console.log("\nSeeding complete:", r);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
