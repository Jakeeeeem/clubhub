#!/usr/bin/env node

/**
 * Large Scale Data Seeding Script for ClubHub
 * Creates a massive working environment with:
 * - 12 Groups (Clubs/Academies)
 * - ~60 Teams (5 per group)
 * - ~900 Players (15 per team)
 * - Demo users for all roles (Admin, Coach, Player, Parent)
 */

const path = require("path");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const poolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

// Simple retry logic for host/port mismatch during local execution
const pool = new Pool(poolConfig);

const FIRST_NAMES = [
  "Oliver",
  "George",
  "Noah",
  "Leo",
  "Arthur",
  "Oscar",
  "Harry",
  "Archie",
  "Jack",
  "Henry",
  "Olivia",
  "Amelia",
  "Isla",
  "Ava",
  "Mia",
  "Ivy",
  "Lily",
  "Hazel",
  "Willow",
  "Sophia",
];
const LAST_NAMES = [
  "Smith",
  "Jones",
  "Williams",
  "Brown",
  "Taylor",
  "Davies",
  "Wilson",
  "Evans",
  "Thomas",
  "Johnson",
  "Roberts",
  "Walker",
  "Wright",
  "Robinson",
  "Thompson",
  "White",
  "Hughes",
  "Edwards",
  "Hall",
  "Green",
];
const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"];
const SPORTS = ["Football", "Rugby", "Cricket", "Netball", "Basketball"];
const LOCATIONS = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Liverpool",
  "Newcastle",
  "Bristol",
  "Sheffield",
  "Leicester",
  "Nottingham",
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedLargeData() {
  const client = await pool.connect();

  try {
    console.log("🚀 Starting LARGE SCALE data seed...\n");
    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash("Demo@123", 10);

    // 1. Create Platform Admin
    await client.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `,
      ["admin@clubhub.com", passwordHash, "Platform", "Admin", "adult", true],
    );

    console.log("✅ Platform Admin created: admin@clubhub.com / Demo@123");

    // 2. Create Master Dummy User
    const masterEmail = "master@demo.com";
    const masterUser = await client.query(
      `
        INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        RETURNING id
    `,
      [masterEmail, passwordHash, "Master", "Dummy", "organization", true],
    );
    console.log("✅ Master Dummy User created: master@demo.com / Demo@123");

    // 3. Create 12 Groups (Organizations) owned by Master
    console.log("🏢 Creating 12 Groups for Master User...");
    const groupIds = [];
    for (let i = 1; i <= 12; i++) {
      const clubName = `${getRandomItem(LOCATIONS)} ${getRandomItem(["United", "City", "Rovers", "Academy", "Elite", "Athletic"])} ${i}`;
      const slug = clubName
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^\w-]+/g, "");
      const org = await client.query(
        `
            INSERT INTO organizations (name, slug, sport, description, location, email, owner_id, member_count, types, is_mock)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
        `,
        [
          clubName,
          slug,
          getRandomItem(SPORTS),
          `Premier group in ${getRandomItem(LOCATIONS)}`,
          getRandomItem(LOCATIONS),
          masterEmail,
          masterUser.rows[0].id,
          0,
          ["club"],
          true,
        ],
      );

      groupIds.push(org.rows[0].id);
    }
    console.log(`   ✅ Created 12 Groups (Owned by master@demo.com)`);

    // 3. Create Teams & Coaches
    console.log("⚽ Creating ~60 Teams and Coaches...");
    const teamIds = [];
    for (const clubId of groupIds) {
      for (let j = 1; j <= 5; j++) {
        const coachFirstName = getRandomItem(FIRST_NAMES);
        const coachLastName = getRandomItem(LAST_NAMES);
        const coachEmail = `coach_${clubId}_${j}@demo.com`;

        // Create user for coach
        const coachUser = await client.query(
          `
                INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
                RETURNING id
            `,
          [
            coachEmail,
            passwordHash,
            coachFirstName,
            coachLastName,
            "adult",
            true,
          ],
        );

        // Add as staff
        const staff = await client.query(
          `
                INSERT INTO staff (user_id, club_id, first_name, last_name, email, role, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `,
          [
            coachUser.rows[0].id,
            clubId,
            coachFirstName,
            coachLastName,
            coachEmail,
            "coach",
            true,
          ],
        );

        const teamName = `${getRandomItem(["Under", "Elite", "Development"])} ${j * 2 + 6}s`;
        const team = await client.query(
          `
                INSERT INTO teams (name, age_group, sport, club_id, description, coach_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `,
          [
            teamName,
            `U${j * 2 + 6}`,
            "Football",
            clubId,
            `${teamName} squad`,
            staff.rows[0].id,
          ],
        );

        teamIds.push({ teamId: team.rows[0].id, clubId });
      }
    }
    console.log(`   ✅ Created 60 Teams with dedicated coaches`);

    // 4. Create ~900 Players
    console.log("👶 Creating ~900 Players...");
    for (const { teamId, clubId } of teamIds) {
      for (let k = 1; k <= 15; k++) {
        const pFirstName = getRandomItem(FIRST_NAMES);
        const pLastName = getRandomItem(LAST_NAMES);

        // Create a parent-less player (or assign to a generic parent)
        // For variety, some will have user_id, some won't
        const hasUser = Math.random() > 0.5;
        let userId = null;
        if (hasUser) {
          const parent = await client.query(
            `
                    INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (email) DO NOTHING
                    RETURNING id
                `,
            [
              `parent_${teamId}_${k}@demo.com`,
              passwordHash,
              getRandomItem(FIRST_NAMES),
              pLastName,
              "adult",
              true,
            ],
          );
          if (parent.rows.length > 0) userId = parent.rows[0].id;
        }

        const player = await client.query(
          `
                INSERT INTO players (
                    first_name, last_name, date_of_birth, position, user_id, club_id, 
                    sport, gender, location, created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                RETURNING id
            `,
          [
            pFirstName,
            pLastName,
            "2012-01-01",
            getRandomItem(POSITIONS),
            userId,
            clubId,
            "Football",
            Math.random() > 0.5 ? "Male" : "Female",
            getRandomItem(LOCATIONS),
          ],
        );

        // Assign to team
        await client.query(
          `
                INSERT INTO team_players (team_id, player_id, position, jersey_number)
                VALUES ($1, $2, $3, $4)
            `,
          [teamId, player.rows[0].id, getRandomItem(POSITIONS), k],
        );
      }

      // Update club member count
      await client.query(
        `
            UPDATE clubs SET member_count = member_count + 15 WHERE id = $1
        `,
        [clubId],
      );
    }
    console.log(`   ✅ Created ~900 Players and assigned to teams`);

    await client.query("COMMIT");
    console.log("\n✨ HUGE data seed successful!");
    console.log("═══════════════════════════════════════════════════");
    console.log("📋 SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log(`- Master User: master@demo.com`);
    console.log(`- Groups Owned: 12`);
    console.log(`- Teams: 60`);
    console.log(`- Players: 900`);
    console.log(`- Coaches: 60`);
    console.log(`- Password for all: Demo@123`);
    console.log("═══════════════════════════════════════════════════\n");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding data:", error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

seedLargeData();
