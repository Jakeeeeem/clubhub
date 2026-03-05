const path = require("path");
// Ensure we're in the right directory for .env - load this BEFORE database config
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const bcrypt = require("bcryptjs");
const { pool, connectDB } = require("../config/database");

/**
 * Seed Demo Users for ClubHub
 * Creates 4 demo accounts: Super Admin, Club Admin, Coach, and Player
 */
async function seedDemoUsers() {
  const client = await pool.connect();

  try {
    console.log("🌱 Starting demo user seed...\n");

    await client.query("BEGIN");

    // Demo Credentials
    const demoUsers = {
      super: { email: "superadmin@clubhub.com", pass: "Super@123" },
      admin: { email: "demo-admin@clubhub.com", pass: "password123" },
      coach: { email: "demo-coach@clubhub.com", pass: "password123" },
      player: { email: "demo-player@clubhub.com", pass: "password123" },
    };

    // Generating hashes dynamically
    const hashes = {
      superadmin: await bcrypt.hash(demoUsers.super.pass, 10),
      admin: await bcrypt.hash(demoUsers.admin.pass, 10),
      coach: await bcrypt.hash(demoUsers.coach.pass, 10),
      player: await bcrypt.hash(demoUsers.player.pass, 10),
    };

    // 1. SUPER ADMIN - Platform Administrator
    console.log("👑 Creating Super Admin...");

    const superAdminResult = await client.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, account_type, is_platform_admin, email_verified, is_mock)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      ON CONFLICT (email) 
      DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        is_platform_admin = EXCLUDED.is_platform_admin,
        updated_at = NOW()
      RETURNING id, email
    `,
      [
        "superadmin@clubhub.com",
        hashes.superadmin,
        "Super",
        "Admin",
        "organization",
        true,
        true,
      ],
    );
    console.log(`   ✅ Super Admin created: ${superAdminResult.rows[0].email}`);
    console.log(`   📧 Email: superadmin@clubhub.com`);
    console.log(`   🔑 Password: Super@123\n`);

    // 2. CLUB ADMIN/OWNER - Club: "Pro Club Demo"
    console.log("🏢 Creating Club Admin & Organization...");

    const adminResult = await client.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified, is_mock)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (email) 
      DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        account_type = EXCLUDED.account_type,
        updated_at = NOW()
      RETURNING id, email
    `,
      [
        "demo-admin@clubhub.com",
        hashes.admin,
        "John",
        "Smith",
        "organization",
        true,
      ],
    );
    const adminUserId = adminResult.rows[0].id;
    console.log(`   ✅ Admin user created: ${adminResult.rows[0].email}`);

    // Create the demo club/organization (safe upsert via SELECT first)
    let clubId;
    const existingClub = await client.query(
      `SELECT id FROM clubs WHERE owner_id = $1 LIMIT 1`,
      [adminUserId],
    );
    if (existingClub.rows.length > 0) {
      clubId = existingClub.rows[0].id;
      await client.query(
        `UPDATE clubs SET name = $1, updated_at = NOW() WHERE id = $2`,
        ["Pro Club Demo", clubId],
      );
      console.log(`   ♻️  Club already exists, updated: Pro Club Demo`);
    } else {
      const clubResult = await client.query(
        `
        INSERT INTO clubs (
          name, sport, description, location, contact_email,
          contact_phone, owner_id, member_count, stripe_account_id, types, is_mock
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
        RETURNING id, name
      `,
        [
          "Pro Club Demo",
          "Football",
          "Premier demo football club showcasing ClubHub features",
          "London, UK",
          "demo-admin@clubhub.com",
          "+44 20 1234 5678",
          adminUserId,
          25,
          null,
          ["academy"],
        ],
      );
      clubId = clubResult.rows[0].id;
      console.log(`   ✅ Club created: ${clubResult.rows[0].name}`);
    }
    // Also ensure an organizations record exists (teams.club_id refs organizations.id)
    let orgId;
    const existingOrg = await client.query(
      `SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1`,
      [adminUserId],
    );
    if (existingOrg.rows.length > 0) {
      orgId = existingOrg.rows[0].id;
    } else {
      const orgResult = await client.query(
        `INSERT INTO organizations (name, sport, description, location, owner_id, slug)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          "Pro Club Demo",
          "Football",
          "Premier demo football club",
          "London, UK",
          adminUserId,
          `pro-club-demo-${adminUserId.substring(0, 8)}`,
        ],
      );
      orgId = orgResult.rows[0].id;
    }

    // Create a demo team (club_id references organizations.id)
    const teamResult = await client.query(
      `
      INSERT INTO teams (name, age_group, club_id, sport)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `,
      ["Under 18s", "U18", orgId, "Football"],
    );

    let teamId = null;
    if (teamResult.rows.length > 0) {
      teamId = teamResult.rows[0].id;
      console.log(`   ✅ Team created: ${teamResult.rows[0].name}`);
    } else {
      // Get existing team
      const existingTeam = await client.query(
        "SELECT id FROM teams WHERE club_id = $1 LIMIT 1",
        [clubId],
      );
      if (existingTeam.rows.length > 0) {
        teamId = existingTeam.rows[0].id;
      }
    }

    // 3. COACH - Assigned to the demo club
    console.log("⚽ Creating Coach...");

    const coachResult = await client.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified, is_mock)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (email) 
      DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW()
      RETURNING id, email
    `,
      [
        "demo-coach@clubhub.com",
        hashes.coach,
        "Michael",
        "Thompson",
        "organization",
        true,
      ],
    );
    const coachUserId = coachResult.rows[0].id;
    console.log(`   ✅ Coach user created: ${coachResult.rows[0].email}`);

    // Add coach to staff table
    await client.query(
      `
      INSERT INTO staff (user_id, club_id, role, is_active, first_name, last_name, email)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, club_id) 
      DO UPDATE SET role = EXCLUDED.role, is_active = true
    `,
      [
        coachUserId,
        clubId,
        "coach",
        true,
        "Michael",
        "Thompson",
        "demo-coach@clubhub.com",
      ],
    );
    console.log(`   ✅ Coach assigned to Pro Club Demo`);

    // Assign coach as head coach on the team (via teams table)
    if (teamId) {
      const staffRow = await client.query(
        `SELECT id FROM staff WHERE user_id = $1 AND club_id = $2 LIMIT 1`,
        [coachUserId, clubId],
      );
      if (staffRow.rows.length > 0) {
        await client.query(`UPDATE teams SET coach_id = $1 WHERE id = $2`, [
          staffRow.rows[0].id,
          teamId,
        ]);
        console.log(`   ✅ Coach assigned to team`);
      }
    }

    console.log(`   📧 Email: demo-coach@clubhub.com`);
    console.log(`   🔑 Password: password123\n`);

    // 4. PLAYER - Member of the demo club
    console.log("👤 Creating Player...");

    const playerResult = await client.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, account_type, email_verified, is_mock)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (email) 
      DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW()
      RETURNING id, email
    `,
      [
        "demo-player@clubhub.com",
        hashes.player,
        "David",
        "Williams",
        "adult",
        true,
      ],
    );
    const playerUserId = playerResult.rows[0].id;
    console.log(`   ✅ Player user created: ${playerResult.rows[0].email}`);

    // Create player profile
    await client.query(
      `
      INSERT INTO user_profiles (user_id, date_of_birth, gender, location, sport, position, bio)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        sport = EXCLUDED.sport,
        position = EXCLUDED.position,
        updated_at = NOW()
    `,
      [
        playerUserId,
        "2006-05-15",
        "Male",
        "London, UK",
        "Football",
        "Forward",
        "Passionate young footballer looking to develop skills and compete at the highest level.",
      ],
    );

    // Add player to club
    const playerProfileResult = await client.query(
      `
      INSERT INTO players (first_name, last_name, email, date_of_birth, position, club_id, user_id, monthly_fee)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email, club_id) 
      DO UPDATE SET user_id = EXCLUDED.user_id
      RETURNING id
    `,
      [
        "David",
        "Williams",
        "demo-player@clubhub.com",
        "2006-05-15",
        "Forward",
        clubId,
        playerUserId,
        50.0,
      ],
    );

    console.log(`   ✅ Player added to Pro Club Demo`);

    // Assign player to team if team exists
    if (teamId && playerProfileResult.rows.length > 0) {
      await client.query(
        `
        INSERT INTO team_players (team_id, player_id)
        VALUES ($1, $2)
        ON CONFLICT (team_id, player_id) DO NOTHING
      `,
        [teamId, playerProfileResult.rows[0].id],
      );
      console.log(`   ✅ Player assigned to team`);
    }

    console.log(`   📧 Email: demo-player@clubhub.com`);
    console.log(`   🔑 Password: password123\n`);

    await client.query("COMMIT");

    console.log("✨ Demo users seeded successfully!\n");
    console.log("═══════════════════════════════════════════════════");
    console.log("📋 DEMO LOGIN CREDENTIALS");
    console.log("═══════════════════════════════════════════════════");
    console.log("🔐 Super Admin (Platform):");
    console.log("   Email: superadmin@clubhub.com");
    console.log("   Pass:  Super@123\n");
    console.log("🏢 Club Admin (Pro Club Demo):");
    console.log("   Email: demo-admin@clubhub.com");
    console.log("   Pass:  password123\n");
    console.log("⚽ Coach (Pro Club Demo):");
    console.log("   Email: demo-coach@clubhub.com");
    console.log("   Pass:  password123\n");
    console.log("👤 Player (Pro Club Demo):");
    console.log("   Email: demo-player@clubhub.com");
    console.log("   Pass:  password123");
    console.log("═══════════════════════════════════════════════════\n");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding demo users:", error);
    throw error;
  } finally {
    client.release();
    // Don't end pool - it's shared
  }
}

// Run the seed
if (require.main === module) {
  seedDemoUsers()
    .then(() => {
      console.log("✅ Seed completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seed failed:", error);
      process.exit(1);
    });
}

module.exports = { seedDemoUsers };
