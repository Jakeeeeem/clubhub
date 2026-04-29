const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { withTransaction } = require("../config/database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

function uuidv4() {
  return crypto.randomUUID();
}

async function seedMasterDemo() {
  console.log("🌱 STARTING MASSIVE MASTER DEMO SEEDING...");

  try {
    await withTransaction(async (client) => {
      // 1. Password Hash
      const hashedPass = await bcrypt.hash("Demo@123", 10);

      // --- 2. USERS (create demo users first so we can assign org owners) ---
      console.log("👤 Creating 10+ Demo Users...");
      const usersData = [
        {
          email: "demo-admin@clubhub.com",
          role: "admin",
          fname: "Demo",
          lname: "Admin",
        },
        {
          email: "scout@demo.com",
          role: "scout",
          fname: "Lead",
          lname: "Scout",
        },
        {
          email: "scout2@demo.com",
          role: "scout",
          fname: "Regional",
          lname: "Scout",
        },
        {
          email: "demo-coach@clubhub.com",
          role: "coach",
          fname: "Demo",
          lname: "Coach",
        },
        {
          email: "coach2@demo.com",
          role: "coach",
          fname: "Academy",
          lname: "Lead",
        },
        {
          email: "demo-player@clubhub.com",
          role: "player",
          fname: "Demo",
          lname: "Player",
        },
        {
          email: "referee@demo.com",
          role: "referee",
          fname: "Senior",
          lname: "Official",
        },
      ];

      const userMap = {};
      for (const u of usersData) {
        // Map arbitrary role labels to the current schema's allowed account_type values
        const accountType = ["admin", "organization"].includes(u.role)
          ? "organization"
          : "adult";
        const res = await client.query(
          `
                    INSERT INTO users (email, password_hash, first_name, last_name, account_type, is_active)
                    VALUES ($1, $2, $3, $4, $5, true)
                    ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
                    RETURNING id
                `,
          [u.email, hashedPass, u.fname, u.lname, accountType],
        );
        userMap[u.email] = res.rows[0].id;
      }

      // --- 3. ORGANIZATIONS ---
      console.log("🏫 Creating 6 Organizations...");
      const orgIds = [
        uuidv4(),
        uuidv4(),
        uuidv4(),
        uuidv4(),
        uuidv4(),
        uuidv4(),
      ];
      const orgDefs = [
        {
          id: orgIds[0],
          name: "Elite Pro Academy",
          slug: "elite-pro-academy",
          types: ["academy"],
          location: "London, UK",
          sport: "Football",
        },
        {
          id: orgIds[1],
          name: "London United Sunday League",
          slug: "london-united",
          types: ["league"],
          location: "London, UK",
          sport: "Football",
        },
        {
          id: orgIds[2],
          name: "St. Georges Park Venue",
          slug: "st-georges",
          types: ["venue"],
          location: "Burton, UK",
          sport: "Football",
        },
        {
          id: orgIds[3],
          name: "Global Scouting Network",
          slug: "gsn",
          types: ["scouting"],
          location: "Manchester, UK",
          sport: "Football",
        },
        {
          id: orgIds[4],
          name: "Premier Youth League",
          slug: "pyl",
          types: ["league"],
          location: "Birmingham, UK",
          sport: "Football",
        },
        {
          id: orgIds[5],
          name: "Manchester Talent Hub",
          slug: "mth",
          types: ["academy"],
          location: "Manchester, UK",
          sport: "Football",
        },
      ];

      for (const o of orgDefs) {
        await client.query(
          `
          INSERT INTO organizations (id, name, slug, types, location, sport, is_active, owner_id)
          VALUES ($1,$2,$3,$4,$5,$6,true,$7)
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location
        `,
          [
            o.id,
            o.name,
            o.slug,
            o.types,
            o.location,
            o.sport,
            userMap["demo-admin@clubhub.com"],
          ],
        );
      }

      const eliteAcademyId = orgIds[0];
      const sundayLeagueId = orgIds[1];
      const scoutingOrgId = orgIds[3];

      // Ensure there's a corresponding `clubs` record for the elite academy org
      let clubForElite = null;
      const existingClub = await client.query(
        "SELECT id FROM clubs WHERE owner_id = $1 LIMIT 1",
        [userMap["demo-admin@clubhub.com"]],
      );
      if (existingClub.rows.length) {
        clubForElite = existingClub.rows[0].id;
      } else {
        const orgInfo = await client.query(
          "SELECT name, location FROM organizations WHERE id = $1 LIMIT 1",
          [eliteAcademyId],
        );
        const newClubId = uuidv4();
        await client.query(
          `INSERT INTO clubs (id, name, description, location, sport, owner_id, types) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            newClubId,
            orgInfo.rows[0].name || "Demo Club",
            orgInfo.rows[0].name || "Demo Club",
            orgInfo.rows[0].location || "Unknown",
            "Football",
            userMap["demo-admin@clubhub.com"],
            ["club"],
          ],
        );
        clubForElite = newClubId;
      }

      // Ensure demo coaches exist in `staff` so teams can reference coach_id
      const staffMap = {};
      const coachEmails = ["demo-coach@clubhub.com", "coach2@demo.com"];
      // Resolve a valid club id for staff.club_id (prefer existing club owned by admin)
      let clubForStaffRes = await client.query(
        "SELECT id FROM clubs WHERE owner_id = $1 LIMIT 1",
        [userMap["demo-admin@clubhub.com"]],
      );
      let clubForStaff = clubForStaffRes.rows.length
        ? clubForStaffRes.rows[0].id
        : null;
      if (!clubForStaff) {
        const anyClub = await client.query("SELECT id FROM clubs LIMIT 1");
        clubForStaff = anyClub.rows.length ? anyClub.rows[0].id : null;
      }
      if (!clubForStaff) {
        // Create a lightweight club record using organization info so FK can succeed
        const orgInfo = await client.query(
          "SELECT name, location FROM organizations WHERE id = $1 LIMIT 1",
          [eliteAcademyId],
        );
        const newClubId = uuidv4();
        await client.query(
          `INSERT INTO clubs (id, name, description, location, sport, owner_id, types) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            newClubId,
            orgInfo.rows[0].name || "Demo Club",
            orgInfo.rows[0].name || "Demo Club",
            orgInfo.rows[0].location || "Unknown",
            "Football",
            userMap["demo-admin@clubhub.com"],
            ["club"],
          ],
        );
        clubForStaff = newClubId;
      }

      for (const email of coachEmails) {
        const uid = userMap[email];
        const userRow = await client.query(
          "SELECT first_name, last_name, email FROM users WHERE id = $1",
          [uid],
        );
        const u = userRow.rows[0];
        const existing = await client.query(
          "SELECT id FROM staff WHERE user_id = $1 LIMIT 1",
          [uid],
        );
        if (existing.rows.length > 0) {
          staffMap[email] = existing.rows[0].id;
        } else {
          const staffRes = await client.query(
            `
            INSERT INTO staff (user_id, first_name, last_name, email, role, club_id)
            VALUES ($1,$2,$3,$4,'coach',$5)
            RETURNING id
          `,
            [
              uid,
              u.first_name || "Coach",
              u.last_name || "Coach",
              u.email,
              clubForStaff,
            ],
          );
          staffMap[email] = staffRes.rows[0].id;
        }
      }

      // --- 6. TEAMS ---
      console.log("⚽ Creating 50 Teams...");
      const teamIds = [];
      const prefixes = [
        "London",
        "Manchester",
        "Midland",
        "Southern",
        "Northern",
        "Elite",
        "Premier",
        "City",
      ];
      const suffixes = [
        "Academy",
        "United",
        "Rovers",
        "FC",
        "Warriors",
        "Stars",
        "Blues",
        "Reds",
      ];

      for (let i = 0; i < 50; i++) {
        const name = `${prefixes[i % prefixes.length]} ${suffixes[i % suffixes.length]} ${i + 1}`;
        const age = i < 15 ? "U16" : i < 30 ? "U14" : "U12";
        const coachStaffId =
          i % 5 === 0
            ? staffMap["coach@demo.com"]
            : staffMap["coach2@demo.com"];
        const res = await client.query(
          `
                INSERT INTO teams (id, name, age_group, club_id, coach_id, sport)
                VALUES ($1, $2, $3, $4, $5, 'Football')
            RETURNING id
          `,
          [uuidv4(), name, age, clubForElite, coachStaffId],
        );
        teamIds.push(res.rows[0].id);
      }

      // --- 7. PLAYERS ---
      console.log("🏃 Seeding 100+ Players...");
      const positions = [
        "GK",
        "CB",
        "LB",
        "RB",
        "CM",
        "LW",
        "RW",
        "ST",
        "DM",
        "AM",
      ];
      for (let i = 1; i <= 120; i++) {
        const fname = `Player_${i}`;
        const lname = `Talent_${i}`;
        const pos = positions[i % positions.length];
        const teamId = teamIds[i % teamIds.length];

        const playerRes = await client.query(
          `INSERT INTO players (user_id, first_name, last_name, email, date_of_birth, position, club_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [
            userMap["demo-player@clubhub.com"],
            fname,
            lname,
            `player${i}@demo.com`,
            "2009-06-15",
            pos,
            clubForElite,
          ],
        );

        const playerId = playerRes.rows[0].id;
        await client.query(
          `INSERT INTO team_players (team_id, player_id, position, jersey_number) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [teamId, playerId, pos, (i % 99) + 1],
        );
      }

      // --- 8. SCOUT WATCHLIST & REPORTS ---
      console.log("🔍 Creating Loads of Scouting Data...");
      // Only populate scouting tables if they exist in the current schema
      const hasScoutWatchlist = (
        await client.query("SELECT to_regclass('public.scout_watchlist') as t")
      ).rows[0].t;
      const hasScoutReports = (
        await client.query("SELECT to_regclass('public.scout_reports') as t")
      ).rows[0].t;
      if (hasScoutWatchlist && hasScoutReports) {
        const playersRes = await client.query(
          "SELECT id FROM players LIMIT 40",
        );
        const playerIds = playersRes.rows.map((r) => r.id);

        for (const pid of playerIds) {
          await client.query(
            `
                    INSERT INTO scout_watchlist (scout_id, player_id, rating, notes)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING
                `,
            [
              userMap["scout@demo.com"],
              pid,
              (pid.length % 5) + 1,
              "Top prospect from periodic assessment.",
            ],
          );

          await client.query(
            `
                    INSERT INTO scout_reports (scout_id, player_id, report_type, data)
                    VALUES ($1, $2, 'player', $3)
                `,
            [
              userMap["scout@demo.com"],
              pid,
              JSON.stringify({
                technical: (pid.length % 5) + 1,
                tactical: (pid.length % 4) + 1,
                mental: 5,
                physical: 4,
                pace: 88,
                dribbling: 75,
              }),
            ],
          );
        }
      } else {
        console.log("ℹ️ Skipping scouting data: tables not present in schema");
      }

      // --- 9. TOURNAMENTS & MATCHES ---
      console.log("🏆 Creating 6 Tournaments...");
      const tourTitles = [
        "Elite Pro Spring Cup",
        "Summer Nations Trophy",
        "Youth League Challenge",
        "FA Grassroots Shield",
        "Manchester Invitational",
        "Winter Solidarity cup",
      ];

      for (let t = 0; t < 6; t++) {
        const status = t === 0 ? "active" : t < 3 ? "upcoming" : "completed";
        const tournamentRes = await client.query(
          `
            INSERT INTO events (title, event_type, event_date, event_time, club_id, created_by)
            VALUES ($1, 'tournament', (CURRENT_DATE + ($2 || ' days')::interval)::date, '10:00', $3, $4)
            RETURNING id
          `,
          [
            tourTitles[t],
            (t - 2) * 15,
            clubForElite,
            userMap["demo-admin@clubhub.com"],
          ],
        );
        const tournamentId = tournamentRes.rows[0].id;

        // Pitches / tournament details — only if the tournament tables exist
        const hasPitches = (
          await client.query(
            "SELECT to_regclass('public.tournament_pitches') as t",
          )
        ).rows[0].t;
        const hasTournamentTeams = (
          await client.query(
            "SELECT to_regclass('public.tournament_teams') as t",
          )
        ).rows[0].t;
        const hasStages = (
          await client.query(
            "SELECT to_regclass('public.tournament_stages') as t",
          )
        ).rows[0].t;
        const hasMatches = (
          await client.query(
            "SELECT to_regclass('public.tournament_matches') as t",
          )
        ).rows[0].t;
        if (!hasPitches || !hasTournamentTeams || !hasStages || !hasMatches) {
          console.log(
            "ℹ️ Skipping tournament details: tournament_* tables not present",
          );
        } else {
          const pitchIds = [];
          for (let p = 1; p <= 4; p++) {
            const res = await client.query(
              `
                INSERT INTO tournament_pitches (event_id, name, pitch_type, pitch_size)
                VALUES ($1, $2, '4G', '9v9')
                RETURNING id
              `,
              [tournamentId, `Pitch ${p}`],
            );
            pitchIds.push(res.rows[0].id);
          }

          // Register 12 teams for each tournament
          const tournamentTeamIds = [];
          for (let i = 0; i < 12; i++) {
            const teamIdx = (t * 12 + i) % teamIds.length;
            const res = await client.query(
              `
                INSERT INTO tournament_teams (event_id, team_name, internal_team_id, status)
                VALUES ($1, $2, $3, 'approved')
                RETURNING id
              `,
              [tournamentId, `Team ${t * 12 + i}`, teamIds[teamIdx]],
            );
            tournamentTeamIds.push(res.rows[0].id);
          }

          // Stages and Matches
          const stageRes = await client.query(
            `
            INSERT INTO tournament_stages (event_id, name, type, sequence)
            VALUES ($1, 'Group Stage', 'league', 1)
            RETURNING id
          `,
            [tournamentId],
          );
          const stageId = stageRes.rows[0].id;

          // Add 5 matches for each tournament
          for (let m = 0; m < 5; m++) {
            await client.query(
              `
                INSERT INTO tournament_matches (event_id, stage_id, home_team_id, away_team_id, round_number, match_number, pitch_id, status, home_score, away_score)
                VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8, $9)
              `,
              [
                tournamentId,
                stageId,
                tournamentTeamIds[m % 6],
                tournamentTeamIds[(m + 1) % 6],
                m + 1,
                pitchIds[m % pitchIds.length],
                status === "completed" ? "completed" : "scheduled",
                status === "completed" ? Math.floor(Math.random() * 5) : null,
                status === "completed" ? Math.floor(Math.random() * 5) : null,
              ],
            );
          }
        }
      }

      // --- 10. TACTICS ---
      console.log("📋 Creating Tactical Formations for all coaches...");
      const formations = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "4-1-4-1"];
      const coaches = coachEmails.map(email => staffMap[email]).filter(id => id);

      for (const coachId of coaches) {
        for (let f = 0; f < 3; f++) {
          await client.query(
            `
                INSERT INTO tactical_formations (team_id, coach_id, name, formation_type, formation_data, is_default)
                VALUES ($1, $2, $3, $4, $5, $6)
              `,
            [
              teamIds[Math.floor(Math.random() * teamIds.length)],
              coachId,
              `Coach Selection ${f + 1}`,
              formations[f % formations.length],
              "{}",
              f === 0,
            ],
          );
        }
      }

      console.log("✅ MASSIVE MASTER DEMO SEEDING COMPLETED SUCCESSFULLY!");
    });
  } catch (err) {
    console.error("❌ MASTER DEMO SEEDING FAILED:", err);
    throw err;
  }
}

if (require.main === module) {
  seedMasterDemo()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedMasterDemo };
