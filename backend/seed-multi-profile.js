const { pool } = require("./config/database");
const bcrypt = require("bcryptjs");

async function clearAndReseed() {
  const client = await pool.connect();

  try {
    console.log("🗑️  Starting fresh database seed...\n");

    await client.query("BEGIN");

    // ============================================
    // STEP 1: Clear all existing data
    // ============================================
    console.log("📋 Step 1: Clearing existing data...");

    const tablesToClear = [
      "team_players",
      "teams",
      "events",
      "payments",
      "organization_members",
      "staff",
      "players",
      "user_preferences",
      "organizations",
      "clubs",
      "users",
    ];

    for (const table of tablesToClear) {
      try {
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        console.log(`  ✓ Cleared ${table}`);
      } catch (err) {
        console.log(`  ⚠️  Skipped ${table} (doesn't exist)`);
      }
    }

    console.log("\n");

    // ============================================
    // STEP 2: Create Parent User
    // ============================================
    console.log("📋 Step 2: Creating parent user...");

    const hashedPassword = await bcrypt.hash("password123", 10);

    const parentResult = await client.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, account_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name
    `,
      ["owner@demo.com", hashedPassword, "John", "Thompson", "organization"],
    );

    const parent = parentResult.rows[0];
    console.log(
      `  ✓ Created parent: ${parent.first_name} ${parent.last_name} (${parent.email})`,
    );

    // Create user preferences
    await client.query(
      `
      INSERT INTO user_preferences (user_id)
      VALUES ($1)
    `,
      [parent.id],
    );

    console.log("\n");

    // ============================================
    // STEP 3: Create Organizations (Clubs)
    // ============================================
    console.log("📋 Step 3: Creating organizations...");

    const clubs = [
      {
        name: "Elite Pro Academy",
        sport: "Football",
        location: "London, UK",
        description:
          "Premier youth football academy focusing on developing elite talent",
        logo_url: "/uploads/elite-pro-logo.png",
      },
      {
        name: "Sunday League FC",
        sport: "Football",
        location: "Manchester, UK",
        description: "Community football club for all ages and skill levels",
        logo_url: "/uploads/sunday-league-logo.png",
      },
      {
        name: "Valley United",
        sport: "Football",
        location: "Birmingham, UK",
        description: "Competitive youth football club with focus on teamwork",
        logo_url: "/uploads/valley-united-logo.png",
      },
    ];

    const createdClubs = [];

    for (const club of clubs) {
      // Generate slug from name
      const slug = club.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      // Create in ORGANIZATIONS table first (API uses this)
      const orgResult = await client.query(
        `
        INSERT INTO organizations (name, slug, description, sport, location, owner_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, sport, location
      `,
        [
          club.name,
          slug,
          club.description,
          club.sport,
          club.location,
          parent.id,
        ],
      );

      const org = orgResult.rows[0];

      // Also insert into CLUBS table (legacy, uses same ID)
      await client.query(
        `
        INSERT INTO clubs (id, name, description, sport, location, owner_id, types)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          org.id,
          club.name,
          club.description,
          club.sport,
          club.location,
          parent.id,
          ["academy"],
        ],
      );

      createdClubs.push(org);

      // Add parent as owner in organization_members (CRITICAL for API to recognize ownership)
      await client.query(
        `
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (organization_id, user_id) DO NOTHING
      `,
        [org.id, parent.id, "owner"],
      );

      console.log(`  ✓ Created club: ${org.name} (${org.location})`);
    }

    console.log("\n");

    // ============================================
    // STEP 4: Create Family Members (Children as Players)
    // ============================================
    console.log("📋 Step 4: Creating family members...");

    const children = [
      {
        first_name: "Emma",
        last_name: "Thompson",
        date_of_birth: "2014-06-15",
        gender: "female",
        sport: "Football",
        position: "Midfielder",
        club_index: 0, // Elite Pro Academy
        team_name: "EPA U10 Lions",
      },
      {
        first_name: "Toby",
        last_name: "Thompson",
        date_of_birth: "2017-02-10",
        gender: "male",
        sport: "Football",
        position: "Forward",
        club_index: 1, // Sunday League FC
        team_name: "Sunday Juniors",
      },
    ];

    const createdChildren = [];

    for (const child of children) {
      const club = createdClubs[child.club_index];

      // Create player record
      const playerResult = await client.query(
        `
        INSERT INTO players (
          user_id, club_id, first_name, last_name, date_of_birth, 
          gender, sport, position, location
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, first_name, last_name, sport, position
      `,
        [
          parent.id,
          club.id,
          child.first_name,
          child.last_name,
          child.date_of_birth,
          child.gender,
          child.sport,
          child.position,
          club.location,
        ],
      );

      const player = playerResult.rows[0];
      createdChildren.push({
        ...player,
        club_id: club.id,
        team_name: child.team_name,
      });

      // Add as member of organization (so they show up in the org)
      await client.query(
        `
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role
      `,
        [club.id, parent.id, "player"],
      );

      console.log(
        `  ✓ Created child: ${player.first_name} ${player.last_name} (${player.position}) → ${club.name}`,
      );
    }

    console.log("\n");

    // ============================================
    // STEP 5: Create Teams for Each Club
    // ============================================
    console.log("📋 Step 5: Creating teams...");

    const createdTeams = [];

    for (const child of createdChildren) {
      const club = createdClubs.find((c) => c.id === child.club_id);

      const teamResult = await client.query(
        `
        INSERT INTO teams (club_id, name, age_group, sport)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, age_group
      `,
        [club.id, child.team_name, "Youth", child.sport],
      );

      const team = teamResult.rows[0];
      createdTeams.push({ ...team, club_id: club.id, player_id: child.id });

      // Add player to team
      await client.query(
        `
        INSERT INTO team_players (team_id, player_id, position)
        VALUES ($1, $2, $3)
      `,
        [team.id, child.id, child.position],
      );

      console.log(
        `  ✓ Created team: ${team.name} (${club.name}) - Added ${child.first_name}`,
      );
    }

    console.log("\n");

    // ============================================
    // STEP 6: Create Events for Each Club
    // ============================================
    console.log("📋 Step 6: Creating events...");

    const eventTypes = ["training", "match", "social", "tournament"];
    let eventCount = 0;

    for (const club of createdClubs) {
      // Create 5 events per club
      for (let i = 0; i < 5; i++) {
        const daysFromNow = i * 3; // Events every 3 days
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + daysFromNow);

        const eventType = eventTypes[i % eventTypes.length];

        await client.query(
          `
          INSERT INTO events (
            club_id, title, description, event_type, event_date, location, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            club.id,
            `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Session ${i + 1}`,
            `${eventType} for ${club.name} players`,
            eventType.toLowerCase(),
            eventDate,
            club.location,
            parent.id,
          ],
        );

        eventCount++;
      }

      console.log(`  ✓ Created 5 events for ${club.name}`);
    }

    console.log(`  📊 Total events created: ${eventCount}\n`);

    // ============================================
    // STEP 7: Create Staff for Each Club
    // ============================================
    console.log("📋 Step 7: Creating staff members...");

    const staffRoles = [
      { role: "coach", first_name: "Mike", last_name: "Johnson" },
      { role: "assistant_coach", first_name: "Sarah", last_name: "Williams" },
      { role: "physio", first_name: "James", last_name: "Brown" },
    ];

    let staffCount = 0;

    for (const club of createdClubs) {
      for (const staffMember of staffRoles) {
        try {
          await client.query(
            `
            INSERT INTO staff (
              club_id, first_name, last_name, role, email
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
            [
              club.id,
              staffMember.first_name,
              staffMember.last_name,
              staffMember.role,
              `${staffMember.first_name.toLowerCase()}.${staffMember.last_name.toLowerCase()}@${club.name.toLowerCase().replace(/\s+/g, "")}.com`,
            ],
          );
          staffCount++;
        } catch (err) {
          console.log(`  ⚠️  Could not create staff (table might not exist)`);
        }
      }
      console.log(`  ✓ Created staff for ${club.name}`);
    }

    console.log(`  📊 Total staff created: ${staffCount}\n`);

    // ============================================
    // STEP 8: Create Recruitment Listings
    // ============================================
    console.log("📋 Step 8: Creating recruitment listings...");

    const listingData = [
      { position: "Striker", age_group: "U12", skill_level: "Advanced" },
      { position: "Midfielder", age_group: "U14", skill_level: "Intermediate" },
      { position: "Defender", age_group: "U10", skill_level: "Beginner" },
    ];

    let listingCount = 0;

    for (const club of createdClubs) {
      for (const listing of listingData) {
        try {
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + 30); // 30 days from now

          await client.query(
            `
            INSERT INTO listings (
              club_id, title, description, position, age_group, 
              skill_level, deadline, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
            [
              club.id,
              `${club.name} - ${listing.position} Wanted`,
              `We are looking for talented ${listing.age_group} players to join our ${listing.position} positions. ${listing.skill_level} level players welcome.`,
              listing.position,
              listing.age_group,
              listing.skill_level,
              deadline,
              parent.id,
            ],
          );
          listingCount++;
        } catch (err) {
          console.log(`  ⚠️  Could not create listing (table might not exist)`);
          break; // Skip remaining listings for this club if table doesn't exist
        }
      }
      if (listingCount > 0) {
        console.log(`  ✓ Created listings for ${club.name}`);
      }
    }

    if (listingCount > 0) {
      console.log(`  📊 Total listings created: ${listingCount}\n`);
    } else {
      console.log(`  ⚠️  Listings table does not exist - skipped\n`);
    }

    await client.query("COMMIT");

    // ============================================
    // Summary
    // ============================================
    console.log("✅ Database seeded successfully!\n");
    console.log("📊 Summary:");
    console.log(`  • Parent User: ${parent.email}`);
    console.log(`  • Clubs: ${createdClubs.length}`);
    console.log(`  • Children: ${createdChildren.length}`);
    console.log(`  • Teams: ${createdTeams.length}`);
    console.log(`  • Events: ${eventCount}`);
    console.log(`  • Staff: ${staffCount}`);
    console.log(`  • Listings: ${listingCount}\n`);

    console.log("🎯 Test Login:");
    console.log(`  Email: ${parent.email}`);
    console.log(`  Password: password123\n`);

    console.log("👨‍👩‍👧 Family Members:");
    createdChildren.forEach((child, index) => {
      const club = createdClubs.find((c) => c.id === child.club_id);
      console.log(
        `  ${index + 1}. ${child.first_name} ${child.last_name} → ${club.name} (${child.position})`,
      );
    });

    console.log("\n🎉 Ready to test multi-profile switching!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed
clearAndReseed().catch(console.error);
