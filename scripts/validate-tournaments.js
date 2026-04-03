/**
 * Tournament Bracket Validation Script
 * Tests full knockout bracket generation and match progression logic.
 */

require("dotenv").config({ path: "backend/.env" });
const { query, withTransaction } = require("../backend/config/database");

async function runValidation() {
  console.log("🚀 Starting Tournament Validation...");

  try {
    // 1. Setup - Use an existing user or create one
    const userRes = await query("SELECT id FROM users LIMIT 1");
    if (userRes.rows.length === 0) throw new Error("No users found in database");
    const userId = userRes.rows[0].id;

    // 2. Setup - Find or create an Organization for the user
    const orgRes = await query("SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1", [userId]);
    let clubId;
    if (orgRes.rows.length === 0) {
      console.log("Creating test organization...");
      const newOrgRes = await query(
        "INSERT INTO organizations (name, owner_id, types) VALUES ($1, $2, $3) RETURNING id",
        ["Validation Club " + Date.now(), userId, ['tournament']]
      );
      clubId = newOrgRes.rows[0].id;
    } else {
      clubId = orgRes.rows[0].id;
    }

    // 3. Create Tournament Event
    console.log("Creating tournament event...");
    const eventRes = await query(
      `INSERT INTO events (title, event_type, event_date, club_id, status, created_by) 
       VALUES ($1, 'tournament', CURRENT_DATE, $2, 'active', $3) RETURNING id`,
      ["Knockout Validation Cup", clubId, userId]
    );
    const eventId = eventRes.rows[0].id;

    // 4. Create 8 Approved Teams
    console.log("Creating 8 teams...");
    const teamIds = [];
    for (let i = 1; i <= 8; i++) {
      const teamRes = await query(
        `INSERT INTO tournament_teams (event_id, team_name, status) 
         VALUES ($1, $2, 'approved') RETURNING id`,
        [eventId, `Team ${String.fromCharCode(64 + i)}`]
      );
      teamIds.push(teamRes.rows[0].id);
    }

    // 5. Trigger Fixture Generation (Simulating logic in tournaments.js)
    console.log("Generating fixtures for 8 teams...");
    
    // -- START LOGIC REPLICATION --
    const stageName = "Knockout Stage";
    const type = "knockout";
    
    await withTransaction(async (client) => {
        // Create Stage
        const stageRes = await client.query(
          "INSERT INTO tournament_stages (event_id, name, type, sequence) VALUES ($1, $2, $3, 1) RETURNING id",
          [eventId, stageName, type]
        );
        const stageId = stageRes.rows[0].id;

        // Fetch Teams
        const teamsRes = await client.query(
            "SELECT * FROM tournament_teams WHERE event_id = $1 AND status = 'approved'",
            [eventId]
        );
        const teams = teamsRes.rows;

        // Shuffle teams
        for (let i = teams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teams[i], teams[j]] = [teams[j], teams[i]];
        }

        const numTeams = teams.length;
        const numRounds = Math.round(Math.log2(numTeams)); 
        const matchesByRound = {};
        
        for (let r = numRounds; r >= 1; r--) {
            matchesByRound[r] = [];
            const matchesInRound = Math.pow(2, numRounds - r);
            for (let m = 0; m < matchesInRound; m++) {
                const res = await client.query(
                    `INSERT INTO tournament_matches (stage_id, event_id, round_number, match_number, status)
                     VALUES ($1, $2, $3, $4, 'scheduled') RETURNING id`,
                    [stageId, eventId, r, m]
                );
                matchesByRound[r].push(res.rows[0].id);
            }
        }

        for (let r = 1; r < numRounds; r++) {
            const currentRoundMatches = matchesByRound[r];
            const nextRoundMatches = matchesByRound[r + 1];
            for (let i = 0; i < currentRoundMatches.length; i++) {
                const matchId = currentRoundMatches[i];
                const nextMatchIdx = Math.floor(i / 2);
                const isHome = i % 2 === 0;
                await client.query(
                    "UPDATE tournament_matches SET next_match_id = $1, progress_to_home = $2 WHERE id = $3",
                    [nextRoundMatches[nextMatchIdx], isHome, matchId]
                );
            }
        }

        const round1MatchIds = matchesByRound[1];
        for (let i = 0; i < round1MatchIds.length; i++) {
            const matchId = round1MatchIds[i];
            const homeTeam = teams[i * 2] || null;
            const awayTeam = teams[i * 2 + 1] || null;
            await client.query(
                "UPDATE tournament_matches SET home_team_id = $1, away_team_id = $2 WHERE id = $3",
                [homeTeam ? homeTeam.id : null, awayTeam ? awayTeam.id : null, matchId]
            );
        }
    });

    // 6. Verification: Total Matches
    const matchesRes = await query("SELECT * FROM tournament_matches WHERE event_id = $1", [eventId]);
    console.log(`Verification: Total matches created: ${matchesRes.rows.length}`);
    if (matchesRes.rows.length !== 7) throw new Error("Incorrect number of matches for 8 teams (should be 7)");

    // 7. Verification: progression links
    const r1MatchesRes = await query("SELECT * FROM tournament_matches WHERE event_id = $1 AND round_number = 1", [eventId]);
    r1MatchesRes.rows.forEach(m => {
        if (!m.next_match_id) throw new Error(`Match ${m.id} in R1 has no next_match_id`);
    });
    console.log("✅ Round 1 match progression links verified.");

    // 8. Simulation: Simulate Round 1 Result
    const match1 = r1MatchesRes.rows[0];
    const winnerId = match1.home_team_id;
    console.log(`Simulating match result: Team ${winnerId} wins match ${match1.id}...`);
    
    await withTransaction(async (client) => {
        const updateRes = await client.query(
            "UPDATE tournament_matches SET home_score = 3, away_score = 0, status = 'completed' WHERE id = $1 RETURNING *",
            [match1.id]
        );
        const match = updateRes.rows[0];
        if (match.next_match_id) {
            const field = match.progress_to_home ? 'home_team_id' : 'away_team_id';
            await client.query(`UPDATE tournament_matches SET ${field} = $1 WHERE id = $2`, [winnerId, match.next_match_id]);
        }
    });

    // 9. Final Verification - Check if winner moved up
    const nextMatchRes = await query("SELECT * FROM tournament_matches WHERE id = $1", [match1.next_match_id]);
    const nextMatch = nextMatchRes.rows[0];
    if (nextMatch.home_team_id === winnerId || nextMatch.away_team_id === winnerId) {
        console.log("✅ Winner successfully progressed to next round!");
    } else {
        throw new Error("Winner failed to progress.");
    }

    console.log("\n✨ ALL TOURNAMENT VALIDATIONS PASSED ✨");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ VALIDATION FAILED:", err.message);
    process.exit(1);
  }
}

runValidation();
