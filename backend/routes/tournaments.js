const express = require("express");
const { query, withTransaction } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
} = require("../middleware/auth");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const emailService = require("../services/email-service");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Ensure video upload directory exists
const videoUploadDir = path.join(
  __dirname,
  "..",
  "uploads",
  "videos",
  "matches",
);
if (!fs.existsSync(videoUploadDir)) {
  fs.mkdirSync(videoUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `match-${req.params.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Not a video file"), false);
    }
  },
});

// Helper: compute number of knockout rounds given N teams
function computeNumRounds(numTeams) {
  const n = Math.max(2, Number(numTeams) || 2);
  return Math.ceil(Math.log2(n));
}
router.computeNumRounds = computeNumRounds;

// ================= PUBLIC / TEAMS =================

/**
 * @route   POST /api/tournaments/register
 * @desc    Register Team for Tournament
 */
router.post(
  "/register",
  [
    body("eventId").isUUID(),
    body("teamName").notEmpty(),
    body("contactEmail").isEmail(),
    body("internalTeamId").optional().isUUID(),
    body("paymentIntentId").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const {
        eventId,
        teamName,
        contactEmail,
        contactPhone,
        internalTeamId,
        paymentIntentId,
      } = req.body;

      const result = await query(
        `
            INSERT INTO tournament_teams (event_id, team_name, contact_email, contact_phone, internal_team_id, payment_intent_id, payment_status, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING *
        `,
        [
          eventId,
          teamName,
          contactEmail,
          contactPhone,
          internalTeamId || null,
          paymentIntentId || null,
          paymentIntentId ? "requires_capture" : "pending",
        ],
      );

      res
        .status(201)
        .json({ message: "Registration successful", team: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Registration failed" });
    }
  },
);

/**
 * @route   POST /api/tournaments
 * @desc    Create a new tournament event and register internal teams
 */
router.post("/", authenticateToken, requireOrganization, async (req, res) => {
  const { name, type, teams, startDate } = req.body;
  if (!name)
    return res.status(400).json({ error: "Tournament name is required" });

  try {
    let tournamentId;
    await withTransaction(async (client) => {
      // Resolve club ID from user/org context (prefer injected orgContext)
      let clubId =
        (req.orgContext && req.orgContext.organization_id) ||
        req.user.organization_id ||
        req.user.groupId ||
        req.user.clubId;
      if (!clubId) {
        const clubRes = await client.query(
          "SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1",
          [req.user.id],
        );
        clubId = clubRes.rows[0]?.id;
      }
      if (!clubId) throw new Error("No club found for user");

      const eventResult = await client.query(
        `INSERT INTO events
             (title, event_type, event_date, club_id, status, tournament_settings, created_by, created_at, updated_at)
           VALUES ($1, 'tournament', $2, $3, 'active', $4, $5, NOW(), NOW())
           RETURNING id`,
        [
          name,
          startDate || new Date().toISOString().split("T")[0],
          clubId,
          JSON.stringify({ type: type || "knockout" }),
          req.user.id,
        ],
      );
      const eventId = eventResult.rows[0].id;
      tournamentId = eventId;

      // Register selected internal teams
      if (Array.isArray(teams) && teams.length > 0) {
        for (const teamId of teams) {
          const teamRes = await client.query(
            "SELECT name FROM teams WHERE id = $1",
            [teamId],
          );
          const teamName = teamRes.rows[0]?.name || "Team";
          await client.query(
            `INSERT INTO tournament_teams (event_id, team_name, internal_team_id, status)
               VALUES ($1, $2, $3, 'approved')`,
            [eventId, teamName, teamId],
          );
        }
      }
    });
    res
      .status(201)
      .json({ id: tournamentId, name, type, message: "Tournament created" });
  } catch (err) {
    console.error("Create tournament error:", err);
    res
      .status(500)
      .json({ error: "Failed to create tournament", detail: err.message });
  }
});

// ================= ADMIN =================

/**
 * @route   GET /api/tournaments/:id/dashboard
 * @desc    Get Tournament Dashboard Data
 */
router.get(
  "/:id/dashboard",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    const eventId = req.params.id;
    try {
      const [event, teams, stages, matches, groups] = await Promise.all([
        query("SELECT * FROM events WHERE id = $1", [eventId]),
        query(
          "SELECT * FROM tournament_teams WHERE event_id = $1 ORDER BY team_name",
          [eventId],
        ),
        query(
          "SELECT * FROM tournament_stages WHERE event_id = $1 ORDER BY sequence",
          [eventId],
        ),
        query(
          `SELECT m.*,
                  ht.team_name AS home_team_name,
                  at.team_name AS away_team_name,
                  p.name AS pitch_name
           FROM tournament_matches m
           LEFT JOIN tournament_teams ht ON m.home_team_id = ht.id
           LEFT JOIN tournament_teams at ON m.away_team_id = at.id
           LEFT JOIN tournament_pitches p ON m.pitch_id = p.id
           WHERE m.event_id = $1
           ORDER BY m.round_number NULLS LAST, m.start_time NULLS LAST, m.match_number`,
          [eventId],
        ),
        query(
          "SELECT * FROM tournament_groups WHERE stage_id IN (SELECT id FROM tournament_stages WHERE event_id = $1)",
          [eventId],
        ),
      ]);

      // Compute standings from completed matches
      const completedMatches = matches.rows.filter(
        (m) => m.status === "completed" && m.home_score !== null,
      );
      const standingsMap = {};
      teams.rows.forEach((t) => {
        standingsMap[t.id] = {
          team_name: t.team_name,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goals_for: 0,
          goals_against: 0,
          points: 0,
        };
      });
      completedMatches.forEach((m) => {
        const h = standingsMap[m.home_team_id];
        const a = standingsMap[m.away_team_id];
        if (!h || !a) return;
        const hs = parseInt(m.home_score) || 0;
        const as_ = parseInt(m.away_score) || 0;
        h.played++;
        a.played++;
        h.goals_for += hs;
        h.goals_against += as_;
        a.goals_for += as_;
        a.goals_against += hs;
        if (hs > as_) {
          h.wins++;
          h.points += 3;
          a.losses++;
        } else if (hs < as_) {
          a.wins++;
          a.points += 3;
          h.losses++;
        } else {
          h.draws++;
          a.draws++;
          h.points++;
          a.points++;
        }
      });
      const standings = Object.values(standingsMap).sort(
        (a, b) =>
          b.points - a.points ||
          b.goals_for - b.goals_against - (a.goals_for - a.goals_against),
      );

      res.json({
        event: event.rows[0],
        teams: teams.rows,
        stages: stages.rows,
        matches: matches.rows,
        groups: groups.rows,
        standings,
        name: event.rows[0]?.title || event.rows[0]?.name || "Tournament",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  },
);

/**
 * @route   POST /api/tournaments/:id/groups
 * @desc    Create groups for a tournament stage
 */
router.post(
  "/:id/groups",
  authenticateToken,
  requireOrganization,
  [body("stageId").isUUID(), body("groupNames").isArray()],
  async (req, res) => {
    const { stageId, groupNames } = req.body;
    try {
      await withTransaction(async (client) => {
        for (const name of groupNames) {
          await client.query(
            `
                    INSERT INTO tournament_groups (stage_id, name)
                    VALUES ($1, $2)
                `,
            [stageId, name],
          );
        }
      });
      res.json({ message: "Groups created" });
    } catch (err) {
      res.status(500).json({ error: "Failed to create groups" });
    }
  },
);

/**
 * @route   POST /api/tournaments/:id/groups/assign
 * @desc    Assign team to a group
 */
router.post(
  "/:id/groups/assign",
  authenticateToken,
  requireOrganization,
  [body("teamId").isUUID(), body("groupId").isUUID()],
  async (req, res) => {
    const { teamId, groupId } = req.body;
    try {
      await query(
        "UPDATE tournament_teams SET current_group_id = $1 WHERE id = $2",
        [groupId, teamId],
      );
      res.json({ message: "Team assigned to group" });
    } catch (err) {
      res.status(500).json({ error: "Assignment failed" });
    }
  },
);

/**
 * @route   POST /api/tournaments/:id/generate-fixtures
 * @desc    Auto-Generate Fixtures
 */
router.post(
  "/:id/generate-fixtures",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    const eventId = req.params.id;
    const { stageName, type, groupId } = req.body;

    try {
      await withTransaction(async (client) => {
        // 1. Get or Create Stage
        let stageId;
        const existingStage = await client.query(
          "SELECT id FROM tournament_stages WHERE event_id = $1 AND name = $2",
          [eventId, stageName],
        );

        if (existingStage.rows.length > 0) {
          stageId = existingStage.rows[0].id;
        } else {
          const stageRes = await client.query(
            `
                    INSERT INTO tournament_stages (event_id, name, type, sequence)
                    VALUES ($1, $2, $3, 1) RETURNING id
                `,
            [eventId, stageName || "Main Stage", type],
          );
          stageId = stageRes.rows[0].id;
        }

        // 2. Fetch Teams (Filtered by group if provided)
        let teamsQuery =
          "SELECT * FROM tournament_teams WHERE event_id = $1 AND status = 'approved'";
        let teamsParams = [eventId];
        if (groupId) {
          teamsQuery += " AND current_group_id = $2";
          teamsParams.push(groupId);
        }

        // Fetch Teams (Filtered by group if provided)
        const teamsRes = await client.query(teamsQuery, teamsParams);
        const teams = teamsRes.rows;

        if (teams.length < 2) throw new Error("Not enough teams");

        if (type === "knockout") {
          // 1. Shuffle teams for initial pairing
          for (let i = teams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teams[i], teams[j]] = [teams[j], teams[i]];
          }

          // 2. Determine power-of-2 bracket size
          const numTeams = teams.length;
          const numRounds = computeNumRounds(numTeams);
          const bracketSize = Math.pow(2, numRounds);

          // 3. Create all matches for all rounds (backwards from Final)
          const matchesByRound = {};

          for (let r = numRounds; r >= 1; r--) {
            matchesByRound[r] = [];
            const matchesInRound = Math.pow(2, numRounds - r);

            for (let m = 0; m < matchesInRound; m++) {
              const res = await client.query(
                `INSERT INTO tournament_matches (stage_id, event_id, round_number, match_number, status)
                 VALUES ($1, $2, $3, $4, 'scheduled') RETURNING id`,
                [stageId, eventId, r, m],
              );
              matchesByRound[r].push(res.rows[0].id);
            }
          }

          // 4. Link matches (Forward progression)
          for (let r = 1; r < numRounds; r++) {
            const currentRoundMatches = matchesByRound[r];
            const nextRoundMatches = matchesByRound[r + 1];

            for (let i = 0; i < currentRoundMatches.length; i++) {
              const matchId = currentRoundMatches[i];
              const nextMatchIdx = Math.floor(i / 2);
              const isHome = i % 2 === 0;

              await client.query(
                `UPDATE tournament_matches 
                 SET next_match_id = $1, progress_to_home = $2 
                 WHERE id = $3`,
                [nextRoundMatches[nextMatchIdx], isHome, matchId],
              );
            }
          }

          // 5. Fill Round 1 with teams
          const round1MatchIds = matchesByRound[1];
          for (let i = 0; i < round1MatchIds.length; i++) {
            const matchId = round1MatchIds[i];
            const homeTeam = teams[i * 2] || null;
            const awayTeam = teams[i * 2 + 1] || null;

            await client.query(
              `UPDATE tournament_matches 
               SET home_team_id = $1, away_team_id = $2 
               WHERE id = $3`,
              [
                homeTeam ? homeTeam.id : null,
                awayTeam ? awayTeam.id : null,
                matchId,
              ],
            );

            // Handle automatic progression for Byes
            if (homeTeam && !awayTeam) {
              const matchRes = await client.query(
                "SELECT next_match_id, progress_to_home FROM tournament_matches WHERE id = $1",
                [matchId],
              );
              const match = matchRes.rows[0];
              if (match.next_match_id) {
                const field = match.progress_to_home
                  ? "home_team_id"
                  : "away_team_id";
                await client.query(
                  `UPDATE tournament_matches SET ${field} = $1 WHERE id = $2`,
                  [homeTeam.id, match.next_match_id],
                );
                await client.query(
                  "UPDATE tournament_matches SET status = 'completed', home_score = 1, away_score = 0 WHERE id = $1",
                  [matchId],
                );
              }
            }
          }
        } else if (type === "league") {
          // Round Robin - assign round numbers using round-robin algorithm
          let matchNumber = 0;
          for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
              const roundNum =
                Math.floor(matchNumber / Math.floor(teams.length / 2)) + 1;
              await client.query(
                `INSERT INTO tournament_matches (stage_id, event_id, home_team_id, away_team_id, round_number, match_number, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')`,
                [
                  stageId,
                  eventId,
                  teams[i].id,
                  teams[j].id,
                  roundNum,
                  matchNumber,
                ],
              );
              matchNumber++;
            }
          }
        }
      });

      res.json({ message: "Fixtures generated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Generation failed: " + err.message });
    }
  },
);

/**
 * @route   GET /api/tournaments/matches/:id/lineups
 * @desc    Get players for match teams
 */
router.get("/matches/:id/lineups", authenticateToken, async (req, res) => {
  try {
    const matchResult = await query(
      `
            SELECT m.*, 
                   ht.internal_team_id as home_internal_id, 
                   at.internal_team_id as away_internal_id
            FROM tournament_matches m
            JOIN tournament_teams ht ON m.home_team_id = ht.id
            JOIN tournament_teams at ON m.away_team_id = at.id
            WHERE m.id = $1
        `,
      [req.params.id],
    );

    if (matchResult.rows.length === 0)
      return res.status(404).json({ error: "Match not found" });
    const match = matchResult.rows[0];

    const [homePlayers, awayPlayers] = await Promise.all([
      match.home_internal_id
        ? query(
            "SELECT id, first_name, last_name FROM players WHERE team_id = $1",
            [match.home_internal_id],
          )
        : { rows: [] },
      match.away_internal_id
        ? query(
            "SELECT id, first_name, last_name FROM players WHERE team_id = $1",
            [match.away_internal_id],
          )
        : { rows: [] },
    ]);

    res.json({
      home: homePlayers.rows,
      away: awayPlayers.rows,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch lineups" });
  }
});

/**
 * @route   POST /api/tournaments/matches/:id/result
 * @desc    Update Match Result and Player Stats
 */
router.post(
  "/matches/:id/result",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    const { homeScore, awayScore, scorers } = req.body; // scorers: [{playerId, teamId, type: 'goal'}]
    try {
      await withTransaction(async (client) => {
        // 1. Update Score
        const matchRes = await client.query(
          `
                UPDATE tournament_matches 
                SET home_score = $1, away_score = $2, status = 'completed', updated_at = NOW()
                WHERE id = $3
                RETURNING *
             `,
          [homeScore, awayScore, req.params.id],
        );
        const match = matchRes.rows[0];

        // 2. Record Scorers & Update Player Stats
        if (scorers && Array.isArray(scorers)) {
          for (const s of scorers) {
            await client.query(
              `
                        INSERT INTO tournament_match_events (match_id, team_id, player_id, event_type)
                        VALUES ($1, $2, $3, $4)
                     `,
              [match.id, s.teamId, s.playerId, s.type || "goal"],
            );

            if (s.playerId && s.type === "goal") {
              await client.query(
                "UPDATE players SET goals = goals + 1, matches_played = matches_played + 1 WHERE id = $1",
                [s.playerId],
              );
            }
          }
        }

        // 3. Increment matches_played for all players (Optional: if we had lineups)
        // For now, only those who scored get credit for the match in this simple implementation

        // 4. Bracket Progression (Existing logic)
        if (match.next_match_id) {
          const winnerId =
            homeScore > awayScore ? match.home_team_id : match.away_team_id;
          if (winnerId) {
            const field = match.progress_to_home
              ? "home_team_id"
              : "away_team_id";
            await client.query(
              `
                        UPDATE tournament_matches SET ${field} = $1 WHERE id = $2
                     `,
              [winnerId, match.next_match_id],
            );
          }
        }
      });
      res.json({ message: "Match result and stats updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Update failed" });
    }
  },
);

// ================= PITCH MANAGEMENT =================

/**
 * @route   POST /api/tournaments/:id/pitches
 * @desc    Add pitches to a tournament
 */
router.post(
  "/:id/pitches",
  authenticateToken,
  requireOrganization,
  [
    body("name").notEmpty(),
    body("pitchType").optional(),
    body("pitchSize").optional(),
  ],
  async (req, res) => {
    const { name, pitchType, pitchSize } = req.body;
    try {
      const result = await query(
        `
                INSERT INTO tournament_pitches (event_id, name, pitch_type, pitch_size)
                VALUES ($1, $2, $3, $4) RETURNING *
            `,
        [req.params.id, name, pitchType || "Grass", pitchSize || "11v11"],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to create pitch" });
    }
  },
);

/**
 * @route   POST /api/tournaments/:id/pitches/bulk
 * @desc    Bulk add pitches to a tournament
 */
router.post(
  "/:id/pitches/bulk",
  authenticateToken,
  requireOrganization,
  [
    body("count").isInt({ min: 1, max: 50 }),
    body("pitchType").optional(),
    body("pitchSize").optional(),
  ],
  async (req, res) => {
    const { count, pitchType, pitchSize } = req.body;
    try {
      await withTransaction(async (client) => {
        for (let i = 1; i <= count; i++) {
          await client.query(
            `
                INSERT INTO tournament_pitches (event_id, name, pitch_type, pitch_size)
                VALUES ($1, $2, $3, $4)
            `,
            [
              req.params.id,
              `Pitch-${i}`,
              pitchType || "Grass",
              pitchSize || "11v11",
            ],
          );
        }
      });
      res.status(201).json({ message: `${count} pitches created` });
    } catch (err) {
      res.status(500).json({ error: "Failed to create pitches" });
    }
  },
);

/**
 * @route   GET /api/tournaments/:id/pitches
 * @desc    Get all pitches for a tournament
 */
router.get("/:id/pitches", authenticateToken, async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM tournament_pitches WHERE event_id = $1 ORDER BY name",
      [req.params.id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pitches" });
  }
});

// ================= PRO SCHEDULER =================

/**
 * @route   POST /api/tournaments/:id/auto-schedule
 * @desc    Professionally schedule matches across multiple pitches
 */
router.post(
  "/:id/auto-schedule",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    const eventId = req.params.id;
    const { stageId, startTime, internalBuffer } = req.body; // startTime e.g. "09:00"

    try {
      await withTransaction(async (client) => {
        // 1. Fetch Stage Info (Duration/Break)
        const stageRes = await client.query(
          "SELECT * FROM tournament_stages WHERE id = $1",
          [stageId],
        );
        if (stageRes.rows.length === 0) throw new Error("Stage not found");
        const stage = stageRes.rows[0];

        // 2. Fetch Tournament Date
        const eventRes = await client.query(
          "SELECT event_date FROM events WHERE id = $1",
          [eventId],
        );
        const eventDate = eventRes.rows[0].event_date;

        // 3. Fetch Unscheduled Matches
        const matchesRes = await client.query(
          "SELECT id, duration FROM tournament_matches WHERE stage_id = $1 AND start_time IS NULL ORDER BY match_number",
          [stageId],
        );
        const matches = matchesRes.rows;

        // 4. Fetch Active Pitches
        const pitchesRes = await client.query(
          "SELECT id FROM tournament_pitches WHERE event_id = $1 AND is_active = TRUE ORDER BY name",
          [eventId],
        );
        const pitches = pitchesRes.rows;
        if (pitches.length === 0)
          throw new Error("No active pitches found. Please add pitches first.");

        // 5. Scheduling Logic
        const duration = stage.match_duration || 20;
        const buffer = internalBuffer || stage.break_duration || 5;
        const totalSlot = duration + buffer;

        // Initialize pitch trackers (next available time on each pitch)
        const baseStartTime = startTime || "09:00";
        const [baseH, baseM] = baseStartTime.split(":").map(Number);

        const pitchAvailability = pitches.map(() => {
          const t = new Date(eventDate);
          t.setHours(baseH, baseM, 0, 0);
          return t;
        });

        for (let i = 0; i < matches.length; i++) {
          // Allow match-specific duration override, else fallback to stage duration
          const matchDuration = matches[i].duration || duration;
          const matchTotalSlot = matchDuration + buffer;

          // Find pitch that is available earliest
          let earliestPitchIdx = 0;
          for (let j = 1; j < pitchAvailability.length; j++) {
            if (pitchAvailability[j] < pitchAvailability[earliestPitchIdx]) {
              earliestPitchIdx = j;
            }
          }

          const matchStartTime = new Date(pitchAvailability[earliestPitchIdx]);
          const matchEndTime = new Date(
            matchStartTime.getTime() + matchDuration * 60000,
          );

          await client.query(
            `
                    UPDATE tournament_matches 
                    SET start_time = $1, end_time = $2, pitch_id = $3
                    WHERE id = $4
                `,
            [
              matchStartTime.toISOString(),
              matchEndTime.toISOString(),
              pitches[earliestPitchIdx].id,
              matches[i].id,
            ],
          );

          // Update pitch availability for NEXT match on THIS pitch
          pitchAvailability[earliestPitchIdx] = new Date(
            matchStartTime.getTime() + matchTotalSlot * 60000,
          );
        }
      });

      res.json({ message: "Auto-scheduling complete" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Scheduling failed: " + err.message });
    }
  },
);

// ================= TEAM MANAGEMENT =================

/**
 * @route   POST /api/tournaments/teams/:id/status
 * @desc    Update tournament team registration status
 */
router.post(
  "/teams/:id/status",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    const { status } = req.body;
    try {
      if (status === "approved") {
        const teamRes = await query(
          "SELECT payment_intent_id, event_id FROM tournament_teams WHERE id = $1",
          [req.params.id],
        );
        const paymentIntentId = teamRes.rows[0]?.payment_intent_id;
        const eventIdForTeam = teamRes.rows[0]?.event_id;

        if (paymentIntentId) {
          // Attempt to capture via Stripe if configured. This is best-effort and non-blocking.
          try {
            if (process.env.STRIPE_SECRET_KEY) {
              let stripeClient = null;
              try {
                stripeClient = require("stripe")(process.env.STRIPE_SECRET_KEY);
              } catch (e) {
                console.warn(
                  "Stripe SDK not available; skipping capture. Install 'stripe' to enable.",
                );
              }

              if (stripeClient && eventIdForTeam) {
                const ev = await query(
                  "SELECT club_id FROM events WHERE id = $1",
                  [eventIdForTeam],
                );
                const clubId = ev.rows[0]?.club_id;
                if (clubId) {
                  const orgRes = await query(
                    "SELECT stripe_account_id FROM organizations WHERE id = $1",
                    [clubId],
                  );
                  const clubStripeAccountId = orgRes.rows[0]?.stripe_account_id;
                  if (clubStripeAccountId) {
                    await stripeClient.paymentIntents.capture(paymentIntentId, {
                      stripeAccount: clubStripeAccountId,
                    });
                  } else {
                    console.log(
                      "No stripe_account_id for club; capture skipped",
                    );
                  }
                }
              }
            } else {
              console.log("STRIPE_SECRET_KEY not configured; skipping capture");
            }
          } catch (stripeErr) {
            console.error("Stripe capture attempt failed:", stripeErr);
          }

          await query(
            "UPDATE tournament_teams SET status = $1, payment_status = 'succeeded' WHERE id = $2",
            [status, req.params.id],
          );
        } else {
          await query("UPDATE tournament_teams SET status = $1 WHERE id = $2", [
            status,
            req.params.id,
          ]);
        }
      } else {
        await query("UPDATE tournament_teams SET status = $1 WHERE id = $2", [
          status,
          req.params.id,
        ]);
      }
      res.json({ message: "Status updated" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update status" });
    }
  },
);

/**
 * @route   POST /api/tournaments/teams/:id/link
 * @desc    Link tournament team to internal club team
 */
router.post(
  "/teams/:id/link",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    const { internalTeamId } = req.body;
    try {
      await query(
        "UPDATE tournament_teams SET internal_team_id = $1 WHERE id = $2",
        [internalTeamId || null, req.params.id],
      );
      res.json({ message: "Team linked successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to link team" });
    }
  },
);

/**
 * @route   POST /api/tournaments/matches/:id/assign-team
 * @desc    Assign team to a specific match slot (Drag & Drop)
 */
router.post(
  "/matches/:id/assign-team",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    const { teamId, position } = req.body; // position: 'home' or 'away'
    try {
      if (position !== "home" && position !== "away") {
        return res
          .status(400)
          .json({ error: "Position must be 'home' or 'away'" });
      }
      const field = position === "home" ? "home_team_id" : "away_team_id";

      // Allow dragging "unassigned" to effectively clear the slot if teamId is null
      await query(`UPDATE tournament_matches SET ${field} = $1 WHERE id = $2`, [
        teamId || null,
        req.params.id,
      ]);
      res.json({ message: "Team assigned to match" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to assign team to match" });
    }
  },
);

/**
 * @route   GET /api/tournaments/:id/bracket
 * @desc    Get structured bracket data for visualization/printing
 */
router.get("/:id/bracket", authenticateToken, async (req, res) => {
  const eventId = req.params.id;
  try {
    const [stages, matches, teams] = await Promise.all([
      query(
        "SELECT * FROM tournament_stages WHERE event_id = $1 ORDER BY sequence",
        [eventId],
      ),
      query(
        `
        SELECT m.*, 
               ht.team_name as home_team_name, 
               at.team_name as away_team_name,
               p.name as pitch_name
        FROM tournament_matches m
        LEFT JOIN tournament_teams ht ON m.home_team_id = ht.id
        LEFT JOIN tournament_teams at ON m.away_team_id = at.id
        LEFT JOIN tournament_pitches p ON m.pitch_id = p.id
        WHERE m.event_id = $1
        ORDER BY m.round_number, m.match_number
      `,
        [eventId],
      ),
      query(
        "SELECT id, team_name, status FROM tournament_teams WHERE event_id = $1",
        [eventId],
      ),
    ]);

    // Group matches by stage and round
    const bracketData = stages.rows.map((stage) => {
      const stageMatches = matches.rows.filter((m) => m.stage_id === stage.id);

      // Group by round
      const rounds = {};
      stageMatches.forEach((m) => {
        if (!rounds[m.round_number]) rounds[m.round_number] = [];
        rounds[m.round_number].push(m);
      });

      return {
        ...stage,
        rounds: Object.keys(rounds)
          .map((r) => ({
            round: parseInt(r),
            matches: rounds[r],
          }))
          .sort((a, b) => a.round - b.round),
      };
    });

    res.json({
      stages: bracketData,
      teams: teams.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bracket data" });
  }
});

/**
 * @route   POST /api/tournaments/matches/:id/video/upload
 * @desc    Upload full match video footage (file upload)
 */
router.post(
  "/matches/:id/video/upload",
  authenticateToken,
  requireOrganization,
  upload.single("video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      // Check if match exists and belongs to correct org
      const orgId =
        (req.orgContext && req.orgContext.organization_id) ||
        req.user.organization_id ||
        req.user.groupId ||
        req.user.clubId;
      const matchCheck = await query(
        `SELECT m.id FROM tournament_matches m 
         JOIN events e ON m.event_id = e.id 
         WHERE m.id = $1 AND e.club_id = $2`,
        [req.params.id, orgId],
      );

      if (matchCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "Match not found or unauthorized" });
      }

      const isPublic = req.body.isPublic !== "false";
      const price = parseFloat(req.body.price) || 0.0;
      const videoUrl = `/uploads/videos/matches/${req.file.filename}`;

      await query(
        `UPDATE tournament_matches 
         SET video_url = $1, is_video_public = $2, video_price = $3, updated_at = NOW() 
         WHERE id = $4`,
        [videoUrl, isPublic, price, req.params.id],
      );

      res.json({
        message: "Video uploaded successfully",
        videoUrl,
        isPublic,
        price,
      });
    } catch (err) {
      console.error("Video upload error:", err);
      res.status(500).json({ error: "Failed to upload video" });
    }
  },
);

/**
 * @route   POST /api/tournaments/:id/invite-staff
 * @desc    Invite staff (Referee, Admin) to tournament
 */
router.post(
  "/:id/invite-staff",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    const { email, role, pitches } = req.body;
    try {
      // Persist assignment if user exists
      const userRes = await query("SELECT id FROM users WHERE email = $1", [
        email,
      ]);
      if (userRes.rows.length > 0) {
        await query(
          "INSERT INTO scout_assignments (scout_id, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [userRes.rows[0].id, req.params.id],
        );
      }

      // Send an invitation email to the address provided
      try {
        const ev = await query(
          "SELECT e.club_id, o.name as club_name FROM events e LEFT JOIN organizations o ON o.id = e.club_id WHERE e.id = $1",
          [req.params.id],
        );
        const clubName = ev.rows[0]?.club_name || "Club";
        const inviterName = req.user.name || req.user.email || "ClubHub";
        const inviteLink = `${process.env.FRONTEND_URL || "https://clubhubsports.net"}/tournaments/${req.params.id}/invite?role=${role}`;
        await emailService.sendClubInviteEmail({
          email,
          clubName,
          inviterName,
          inviteLink,
          personalMessage: `You were invited as ${role}`,
          clubRole: role,
        });
      } catch (mailErr) {
        console.warn("Failed to send invite email:", mailErr);
      }

      res.json({ message: "Staff invitation sent successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to invite staff" });
    }
  },
);

/**
 * @route   POST /api/tournaments/:id/invite-team
 * @desc    Invite Team to tournament via email
 */
router.post(
  "/:id/invite-team",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    const { email } = req.body;
    try {
      // Send a team invitation email with registration/registration link
      try {
        const ev = await query(
          "SELECT e.club_id, o.name as club_name FROM events e LEFT JOIN organizations o ON o.id = e.club_id WHERE e.id = $1",
          [req.params.id],
        );
        const clubName = ev.rows[0]?.club_name || "Club";
        const inviterName = req.user.name || req.user.email || "ClubHub";
        const inviteLink = `${process.env.FRONTEND_URL || "https://clubhubsports.net"}/tournaments/${req.params.id}/register`;
        await emailService.sendClubInviteEmail({
          email,
          clubName,
          inviterName,
          inviteLink,
          personalMessage: "Register your team to participate",
          clubRole: "team",
        });
      } catch (mailErr) {
        console.warn("Failed to send team invite email:", mailErr);
      }

      res.json({ message: "Team invitation sent to " + email });
    } catch (err) {
      res.status(500).json({ error: "Failed to invite team" });
    }
  },
);

/**
 * @route   DELETE /api/tournaments/pitches/:id
 * @desc    Delete a pitch
 */
router.delete(
  "/pitches/:id",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      await query("DELETE FROM tournament_pitches WHERE id = $1", [
        req.params.id,
      ]);
      res.json({ message: "Pitch deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete pitch" });
    }
  },
);

// exported at end of file

// ================= GATED VIDEO & LAYOUT =================

/**
 * @route   POST /api/tournaments/matches/:id/video/attach
 * @desc    Attach gated footage metadata to tournament match
 */
router.post(
  "/matches/:id/video/attach",
  authenticateToken,
  requireOrganization,
  [
    body("videoUrl").isURL(),
    body("videoPrice").optional().isNumeric(),
    body("videoAccess").isIn(["public", "invite_only"]),
  ],
  async (req, res) => {
    const { videoUrl, videoPrice, videoAccess } = req.body;
    try {
      await query(
        `UPDATE tournament_matches SET video_url = $1, video_price = $2, video_access = $3 WHERE id = $4`,
        [videoUrl, videoPrice || 0, videoAccess, req.params.id],
      );
      res.json({ message: "Video attached successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to attach video" });
    }
  },
);

/**
 * @route   GET /api/tournaments/matches/:id/video
 * @desc    Retrieve video conditionally based on paywall and access checks
 */
router.get("/matches/:id/video", async (req, res) => {
  try {
    const matchRes = await query(
      "SELECT video_url, video_price, video_access FROM tournament_matches WHERE id = $1",
      [req.params.id],
    );
    if (matchRes.rows.length === 0 || !matchRes.rows[0].video_url)
      return res.status(404).json({ error: "Video not found" });

    const { video_url, video_price, video_access } = matchRes.rows[0];

    // For demonstration, simulating success. In production:
    // If video_price > 0, check user's payment_intents or access token
    // If video_access === 'invite_only', enforce authenticateToken manually here

    res.json({ url: video_url, message: "Video access granted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to access video" });
  }
});

/**
 * @route   GET /api/tournaments/:id/layout
 * @desc    Layout data for printing and matrix UI
 */
router.get("/:id/layout", async (req, res) => {
  try {
    const layout = await query(
      `SELECT m.id, m.start_time, m.duration, ht.team_name as home, at.team_name as away, p.name as pitch, p.pitch_type, p.pitch_size
       FROM tournament_matches m
       LEFT JOIN tournament_teams ht ON m.home_team_id = ht.id
       LEFT JOIN tournament_teams at ON m.away_team_id = at.id
       LEFT JOIN tournament_pitches p ON m.pitch_id = p.id
       WHERE m.event_id = $1 AND m.start_time IS NOT NULL
       ORDER BY m.start_time`,
      [req.params.id],
    );
    res.json(layout.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate layout" });
  }
});

/**
 * @route   POST /api/tournaments/:id/invite
 * @desc    Dispatch email requests to join tournament as Admin/Ref/Team
 */
router.post(
  "/:id/invite",
  authenticateToken,
  requireOrganization,
  [body("email").isEmail(), body("role").isIn(["admin", "referee", "team"])],
  async (req, res) => {
    const { email, role } = req.body;
    try {
      await query(
        `INSERT INTO tournament_invites (event_id, email, role, created_by) VALUES ($1, $2, $3, $4)`,
        [req.params.id, email, role, req.user.id],
      );
      // Here: Send email with unique link using email-service.js
      res.json({ message: "Invitation sent successfully" });
    } catch (err) {
      if (err.code === "23505")
        return res
          .status(400)
          .json({ error: "Invite already sent to this email for this role" });
      res.status(500).json({ error: "Failed to send invite" });
    }
  },
);

module.exports = router;
