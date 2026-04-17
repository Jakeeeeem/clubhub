const express = require("express");
const { query, withTransaction } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
  optionalAuth,
} = require("../middleware/auth");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const emailService = require("../services/email-service");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
  optionalAuth,
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

      // Attach created_by_user_id if caller is authenticated
      const createdBy = req.user && req.user.id ? req.user.id : null;

      const result = await query(
        `
            INSERT INTO tournament_teams (event_id, team_name, contact_email, contact_phone, internal_team_id, payment_intent_id, payment_status, status, created_by_user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
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
          createdBy,
        ],
      );

      const team = result.rows[0];

      // If the caller is unauthenticated, return a short-lived registration token
      if (!createdBy) {
        const ttlMs = parseInt(
          process.env.REGISTRATION_TOKEN_TTL_MS || String(24 * 60 * 60 * 1000),
        ); // default 24 hours
        const secret = process.env.SESSION_SECRET || "dev_secret_change_me";
        const payload = {
          ttid: team.id,
          email: contactEmail,
          iat: Date.now(),
          exp: Date.now() + ttlMs,
        };
        const payloadB64 = Buffer.from(JSON.stringify(payload)).toString(
          "base64",
        );
        const sig = require("crypto")
          .createHmac("sha256", secret)
          .update(payloadB64)
          .digest("base64");
        const registrationToken = `${payloadB64}.${sig}`;

        return res.status(201).json({
          message: "Registration successful (guest)",
          team,
          registrationToken,
          expiresInMs: ttlMs,
        });
      }

      res.status(201).json({ message: "Registration successful", team });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Registration failed" });
    }
  },
);

/**
 * @route POST /api/tournaments/register/complete
 * @desc  Complete a guest registration by linking it to an authenticated user
 */
router.post(
  "/register/complete",
  authenticateToken,
  [body("registrationToken").notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { registrationToken } = req.body;
      const parts = String(registrationToken).split(".");
      if (parts.length !== 2)
        return res.status(400).json({ error: "Invalid token format" });

      const [payloadB64, sig] = parts;
      const secret = process.env.SESSION_SECRET || "dev_secret_change_me";
      const expectedSig = require("crypto")
        .createHmac("sha256", secret)
        .update(payloadB64)
        .digest("base64");
      if (sig !== expectedSig)
        return res.status(400).json({ error: "Invalid token signature" });

      let payload;
      try {
        payload = JSON.parse(
          Buffer.from(payloadB64, "base64").toString("utf8"),
        );
      } catch (e) {
        return res.status(400).json({ error: "Invalid token payload" });
      }

      if (payload.exp && Date.now() > payload.exp)
        return res.status(400).json({ error: "Token expired" });

      const teamId = payload.ttid;
      if (!teamId)
        return res.status(400).json({ error: "Token missing team id" });

      // Ensure the team exists and is not already linked
      const teamRes = await query(
        "SELECT id, created_by_user_id FROM tournament_teams WHERE id = $1",
        [teamId],
      );
      if (teamRes.rows.length === 0)
        return res.status(404).json({ error: "Registration not found" });
      if (teamRes.rows[0].created_by_user_id)
        return res
          .status(400)
          .json({ error: "Registration already completed" });

      await query(
        "UPDATE tournament_teams SET created_by_user_id = $1, updated_at = NOW() WHERE id = $2",
        [req.user.id, teamId],
      );

      res.json({ message: "Registration linked to account" });
    } catch (err) {
      console.error("Complete registration failed", err);
      res.status(500).json({ error: "Failed to complete registration" });
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

        // Ensure video_purchases table has expected columns
        await query(`ALTER TABLE video_purchases ADD COLUMN IF NOT EXISTS capture_on_approval BOOLEAN DEFAULT false`);

        // Create Stripe PaymentIntent
        const amount = Math.round(price * 100); // cents
        const currency = process.env.DEFAULT_CURRENCY || "gbp";

        // Determine if this match's event/club has a connected Stripe account
        const ev = await query(
          `SELECT e.club_id FROM events e JOIN tournament_matches m ON m.event_id = e.id WHERE m.id = $1 LIMIT 1`,
          [req.params.id],
        );
        const clubId = ev.rows[0]?.club_id || null;
        let transferData = undefined;
        if (clubId) {
          const orgRes = await query(`SELECT stripe_account_id FROM organizations WHERE id = $1 LIMIT 1`, [clubId]);
          const stripeAccountId = orgRes.rows[0]?.stripe_account_id;
          if (stripeAccountId) {
            transferData = { destination: stripeAccountId };
          }
        }

        const captureOnApproval = !!req.body.captureOnApproval;

        const paymentIntentParams = {
          amount,
          currency,
          metadata: { match_id: req.params.id, user_id: req.user.id },
          description: `Match video purchase: match ${req.params.id}`,
        };
        if (captureOnApproval) paymentIntentParams.capture_method = 'manual';
        if (transferData) paymentIntentParams.transfer_data = transferData;

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        // Insert purchase record (store amount in cents)
        await query(
          `INSERT INTO video_purchases (user_id, match_id, payment_intent_id, payment_status, amount, currency, capture_on_approval) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            req.user.id,
            req.params.id,
            paymentIntent.id,
            paymentIntent.status,
            amount,
            currency,
            captureOnApproval,
          ],
        );
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

    // Enforce access rules
    // 1) Public free video
    if (
      (!video_price || Number(video_price) === 0) &&
      video_access === "public"
    ) {
      return res.json({ url: video_url, message: "Video access granted" });
    }

    // 2) Invite-only content: require authenticated user and membership/staff/invite
    if (video_access === "invite_only") {
      if (!req.user)
        return res.status(401).json({ error: "Authentication required" });

      // Check if user is staff for the club that owns this match
      const staffCheck = await query(
        `SELECT 1 FROM staff WHERE user_id = $1 AND club_id = (SELECT club_id FROM tournament_matches WHERE id = $2) LIMIT 1`,
        [req.user.id, req.params.id],
      );
      if (staffCheck.rows.length > 0)
        return res.json({
          url: video_url,
          message: "Video access granted (staff)",
        });

      // Check if user has a team in the same tournament (team registration / participant)
      const participantCheck = await query(
        `SELECT 1 FROM tournament_teams tt WHERE tt.tournament_id = (SELECT tournament_id FROM tournament_matches WHERE id = $1) AND (tt.created_by_user_id = $2 OR tt.contact_email = $3) LIMIT 1`,
        [req.params.id, req.user.id, req.user.email],
      );
      if (participantCheck.rows.length > 0)
        return res.json({
          url: video_url,
          message: "Video access granted (participant)",
        });

      // Otherwise deny
      return res
        .status(403)
        .json({ error: "Access denied: invite-only video" });
    }

    // 3) Paywalled content: require completed purchase
    if (video_price && Number(video_price) > 0) {
      if (!req.user)
        return res
          .status(401)
          .json({ error: "Authentication required to purchase video" });

      // video_purchases table is managed via migrations; ensure migration applied in deployment

      const purchaseRes = await query(
        `SELECT 1 FROM video_purchases WHERE user_id = $1 AND match_id = $2 AND payment_status IN ('succeeded','captured') LIMIT 1`,
        [req.user.id, req.params.id],
      );
      if (purchaseRes.rows.length > 0)
        return res.json({
          url: video_url,
          message: "Video access granted (purchased)",
        });

      return res.status(402).json({
        error: "Payment required",
        purchase_endpoint: `/api/tournaments/matches/${req.params.id}/video/purchase`,
      });
    }

    // Fallback deny
    return res.status(403).json({ error: "Access denied" });
  } catch (err) {
    res.status(500).json({ error: "Failed to access video" });
  }
});

/**
 * @route   POST /api/tournaments/matches/:id/video/purchase
 * @desc    Create a Stripe PaymentIntent for a match video purchase
 */
router.post(
  "/matches/:id/video/purchase",
  authenticateToken,
  async (req, res) => {
    try {
      const matchRes = await query(
        "SELECT id, video_price, video_access FROM tournament_matches WHERE id = $1",
        [req.params.id],
      );
      if (matchRes.rows.length === 0)
        return res.status(404).json({ error: "Match not found" });

      const match = matchRes.rows[0];
      const price = Number(match.video_price || 0);
      if (!price || price <= 0)
        return res.status(400).json({ error: "This video is not for sale" });

      // video_purchases table is managed via migrations; ensure migration applied in deployment

      // Create Stripe PaymentIntent
      const amount = Math.round(price * 100);
      const currency = process.env.DEFAULT_CURRENCY || "gbp";

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        metadata: { match_id: req.params.id, user_id: req.user.id },
        description: `Match video purchase: match ${req.params.id}`,
      });

      // Insert purchase record
      await query(
        `INSERT INTO video_purchases (user_id, match_id, payment_intent_id, payment_status, amount, currency) VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          req.user.id,
          req.params.id,
          paymentIntent.id,
          paymentIntent.status,
          price,
          currency,
        ],
      );

      res.json({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      });
    } catch (err) {
      console.error("Video purchase error:", err);
      res.status(500).json({ error: "Failed to create purchase" });
    }
  },
);

/**
 * @route POST /api/tournaments/matches/:id/video/capture
 * @desc Capture a previously authorised PaymentIntent (capture-on-approval flow)
 */
router.post(
  "/matches/:id/video/capture",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      if (!paymentIntentId) return res.status(400).json({ error: 'paymentIntentId required' });

      // Attempt capture
      const captured = await stripe.paymentIntents.capture(paymentIntentId);

      // Update DB record if present
      await query(`UPDATE video_purchases SET payment_status = $1, purchased_at = NOW() WHERE payment_intent_id = $2`, [captured.status, paymentIntentId]);

      res.json({ success: true, intent: captured });
    } catch (err) {
      console.error('Capture intent failed:', err);
      res.status(500).json({ error: 'Failed to capture payment intent' });
    }
  },
);

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

/**
 * @route   POST /api/tournaments/:id/invites/accept
 * @desc    Accept a tournament invite for the authenticated user
 */
router.post("/:id/invites/accept", authenticateToken, async (req, res) => {
  try {
    // Find a pending invite for this event matching the user's email or user_id
    const inviteRes = await query(
      `SELECT ti.*, e.club_id FROM tournament_invites ti JOIN events e ON e.id = ti.event_id WHERE ti.event_id = $1 AND ti.status = 'pending' AND (ti.email = $2 OR ti.user_id = $3) LIMIT 1`,
      [req.params.id, req.user.email, req.user.id],
    );

    if (inviteRes.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No pending invite found for this user" });
    }

    const invite = inviteRes.rows[0];

    // Ensure invite is for this event
    if (invite.event_id.toString() !== req.params.id.toString()) {
      return res
        .status(400)
        .json({ error: "Invite does not match this event" });
    }

    // Accept invite in a transaction and create staff/org membership
    const result = await withTransaction(async (client) => {
      await client.query(
        `UPDATE tournament_invites SET status = 'accepted', user_id = $1, updated_at = NOW() WHERE id = $2`,
        [req.user.id, invite.id],
      );

      // Ensure organization_members row exists
      await client.query(
        `INSERT INTO organization_members (user_id, organization_id, role, status, joined_at)
         VALUES ($1, $2, $3, 'active', NOW())
         ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role, status = 'active'`,
        [
          req.user.id,
          invite.club_id,
          invite.role === "team" ? "staff" : invite.role,
        ],
      );

      // Add to staff table for the club if not present (or update role)
      await client.query(
        `INSERT INTO staff (user_id, club_id, first_name, last_name, email, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (user_id, club_id) DO UPDATE SET role = EXCLUDED.role, is_active = true`,
        [
          req.user.id,
          invite.club_id,
          req.user.first_name || null,
          req.user.last_name || null,
          req.user.email || null,
          invite.role,
        ],
      );

      return { accepted: true, role: invite.role };
    });

    res.json({ message: "Invite accepted", success: true, details: result });
  } catch (err) {
    console.error("Accept tournament invite error:", err);
    res.status(500).json({ error: "Failed to accept invite" });
  }
});

/**
 * @route   POST /api/tournaments/:id/invites/:inviteId/decline
 * @desc    Decline a specific tournament invite
 */
router.post(
  "/:id/invites/:inviteId/decline",
  authenticateToken,
  async (req, res) => {
    try {
      const { inviteId } = req.params;

      const inv = await query(
        `SELECT * FROM tournament_invites WHERE id = $1 AND event_id = $2 LIMIT 1`,
        [inviteId, req.params.id],
      );

      if (inv.rows.length === 0) {
        return res.status(404).json({ error: "Invite not found" });
      }

      const invite = inv.rows[0];
      if (invite.email && invite.email !== req.user.email) {
        return res
          .status(403)
          .json({ error: "Invite email does not match your account" });
      }

      await query(
        `UPDATE tournament_invites SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
        [inviteId],
      );

      res.json({ message: "Invite declined" });
    } catch (err) {
      console.error("Decline tournament invite error:", err);
      res.status(500).json({ error: "Failed to decline invite" });
    }
  },
);

/**
 * @route POST /api/tournaments/teams/:id/submit
 * @desc  Team submits their registration for admin approval
 */
router.post("/teams/:id/submit", async (req, res) => {
  try {
    const teamId = req.params.id;
    // Mark as submitted
    await query(
      "UPDATE tournament_teams SET status = 'submitted', updated_at = NOW() WHERE id = $1",
      [teamId],
    );

    // Find event and club for context
    const t = await query(
      "SELECT event_id, team_name FROM tournament_teams WHERE id = $1",
      [teamId],
    );
    if (t.rows.length === 0)
      return res.status(404).json({ error: "Team not found" });
    const eventId = t.rows[0].event_id;
    const teamName = t.rows[0].team_name;

    const ev = await query("SELECT title, club_id FROM events WHERE id = $1", [
      eventId,
    ]);
    const clubId = ev.rows[0]?.club_id;
    const eventTitle = ev.rows[0]?.title || "Tournament";

    // Notify club owner if available
    if (clubId) {
      const ownerRes = await query(
        "SELECT owner_id FROM organizations WHERE id = $1",
        [clubId],
      );
      const ownerId = ownerRes.rows[0]?.owner_id;
      if (ownerId) {
        const userRes = await query(
          "SELECT email, first_name FROM users WHERE id = $1",
          [ownerId],
        );
        if (userRes.rows.length > 0) {
          const toEmail = userRes.rows[0].email;
          const firstName = userRes.rows[0].first_name || "";
          try {
            await emailService.sendClubInviteEmail({
              email: toEmail,
              clubName: ev.rows[0]?.title || "Club",
              inviterName: "ClubHub",
              inviteLink: `${process.env.FRONTEND_URL || "https://clubhubsports.net"}/admin/tournaments/${eventId}`,
              personalMessage: `Team ${teamName} has submitted registration for ${eventTitle}. Please review and approve.`,
              clubRole: "admin",
            });
          } catch (mailErr) {
            console.warn(
              "Failed to notify owner about submission:",
              mailErr.message,
            );
          }
        }
      }
    }

    res.json({ message: "Team submitted for approval" });
  } catch (err) {
    console.error("Submit for approval failed", err);
    res.status(500).json({ error: "Failed to submit registration" });
  }
});

/**
 * @route PATCH /api/tournaments/pitches/:id/availability
 * @desc  Set pitch available from/to times (HH:MM)
 */
router.patch(
  "/pitches/:id/availability",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { availableFrom, availableTo } = req.body; // strings '09:00'
      // Ensure columns exist
      await query(
        "ALTER TABLE tournament_pitches ADD COLUMN IF NOT EXISTS available_from VARCHAR(10)",
      );
      await query(
        "ALTER TABLE tournament_pitches ADD COLUMN IF NOT EXISTS available_to VARCHAR(10)",
      );

      await query(
        "UPDATE tournament_pitches SET available_from = $1, available_to = $2, updated_at = NOW() WHERE id = $3",
        [availableFrom || null, availableTo || null, req.params.id],
      );
      res.json({ message: "Pitch availability updated" });
    } catch (err) {
      console.error("Pitch availability update failed", err);
      res.status(500).json({ error: "Failed to update availability" });
    }
  },
);

/**
 * @route POST /api/tournaments/:id/schedule-templates
 * @desc  Save current tournament schedule as a reusable template
 */
router.post(
  "/:id/schedule-templates",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const eventId = req.params.id;
      const { name } = req.body;
      if (!name)
        return res.status(400).json({ error: "Template name required" });

      // Ensure templates table exists
      await query(`
        CREATE TABLE IF NOT EXISTS tournament_schedule_templates (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          club_id UUID,
          event_id UUID,
          name VARCHAR(255),
          template JSONB,
          created_by UUID,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Capture current matches for event
      const matchesRes = await query(
        `SELECT id, home_team_id, away_team_id, start_time, end_time, pitch_id, round_number, match_number FROM tournament_matches WHERE event_id = $1 ORDER BY round_number, match_number`,
        [eventId],
      );

      // Determine club_id
      const ev = await query("SELECT club_id FROM events WHERE id = $1", [
        eventId,
      ]);
      const clubId = ev.rows[0]?.club_id || null;

      const insertRes = await query(
        `INSERT INTO tournament_schedule_templates (club_id, event_id, name, template, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [clubId, eventId, name, JSON.stringify(matchesRes.rows), req.user.id],
      );

      res
        .status(201)
        .json({ id: insertRes.rows[0].id, message: "Template saved" });
    } catch (err) {
      console.error("Save template failed", err);
      res.status(500).json({ error: "Failed to save template" });
    }
  },
);

/**
 * @route GET /api/tournaments/:id/schedule-templates
 * @desc  List saved templates for this event
 */
router.get("/:id/schedule-templates", authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const rows = await query(
      "SELECT id, name, created_at FROM tournament_schedule_templates WHERE event_id = $1 ORDER BY created_at DESC",
      [eventId],
    );
    res.json(rows.rows);
  } catch (err) {
    console.error("List templates failed", err);
    res.status(500).json({ error: "Failed to list templates" });
  }
});

/**
 * @route GET /api/tournaments/matches/:id/qr-token
 * @desc  Generate short-lived QR token for match check-in
 */
router.get("/matches/:id/qr-token", authenticateToken, async (req, res) => {
  try {
    const matchId = req.params.id;
    const matchRes = await query(
      "SELECT event_id FROM tournament_matches WHERE id = $1",
      [matchId],
    );
    if (matchRes.rows.length === 0)
      return res.status(404).json({ error: "Match not found" });
    const eventId = matchRes.rows[0].event_id;

    const ttlMs = parseInt(
      process.env.QR_TOKEN_TTL_MS || String(15 * 60 * 1000),
    );
    const secret =
      process.env.QR_TOKEN_SECRET ||
      process.env.SESSION_SECRET ||
      "dev_secret_change_me";
    const payload = {
      mid: matchId,
      eid: eventId,
      iat: Date.now(),
      exp: Date.now() + ttlMs,
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    const sig = require("crypto")
      .createHmac("sha256", secret)
      .update(payloadB64)
      .digest("base64");
    const token = `${payloadB64}.${sig}`;
    res.json({ token, ttlMs });
  } catch (err) {
    console.error("Match QR token generation failed", err);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

/**
 * @route POST /api/tournaments/matches/:id/qr-checkin
 * @desc  Accept match QR token and record checkin (allows anonymous)
 */
router.post("/matches/:id/qr-checkin", async (req, res) => {
  try {
    const matchId = req.params.id;
    const { token, playerId, latitude, longitude } = req.body;
    if (!token) return res.status(400).json({ error: "Missing token" });

    const parts = String(token).split(".");
    if (parts.length !== 2)
      return res.status(400).json({ error: "Invalid token format" });
    const [payloadB64, sig] = parts;
    const secret =
      process.env.QR_TOKEN_SECRET ||
      process.env.SESSION_SECRET ||
      "dev_secret_change_me";
    const expectedSig = require("crypto")
      .createHmac("sha256", secret)
      .update(payloadB64)
      .digest("base64");
    if (sig !== expectedSig)
      return res.status(400).json({ error: "Invalid token signature" });

    let payload;
    try {
      payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8"));
    } catch (e) {
      return res.status(400).json({ error: "Invalid token payload" });
    }

    if (!payload || payload.mid != matchId)
      return res.status(400).json({ error: "Token does not match match" });
    if (payload.exp && Date.now() > payload.exp)
      return res.status(400).json({ error: "Token expired" });

    // Map playerId to user_id if provided
    let userId = null;
    if (playerId) {
      const p = await query("SELECT user_id FROM players WHERE id = $1", [
        playerId,
      ]);
      if (p.rows.length === 0)
        return res.status(404).json({ error: "Player not found" });
      userId = p.rows[0].user_id;
    }

    // Find event_id from match
    const m = await query(
      "SELECT event_id FROM tournament_matches WHERE id = $1",
      [matchId],
    );
    const eventId = m.rows[0]?.event_id;
    if (!eventId)
      return res.status(404).json({ error: "Match not linked to event" });

    // Insert into event_checkins (reuse existing table)
    await query(
      `INSERT INTO event_checkins (event_id, user_id, checkin_method, location_lat, location_lng) VALUES ($1, $2, $3, $4, $5)`,
      [eventId, userId, "qr_match", latitude || null, longitude || null],
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Match QR checkin failed", err);
    res.status(500).json({ error: "QR checkin failed" });
  }
});

/**
 * @route POST /api/tournaments/matches/:id/live-update
 * @desc  Update live status or score and notify stakeholders
 */
router.post(
  "/matches/:id/live-update",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const matchId = req.params.id;
      const { liveStatus, homeScore, awayScore, note } = req.body;

      const updates = [];
      const params = [];
      let idx = 1;
      if (liveStatus !== undefined) {
        updates.push(`live_status = $${idx++}`);
        params.push(liveStatus);
      }
      if (homeScore !== undefined) {
        updates.push(`home_score = $${idx++}`);
        params.push(homeScore);
      }
      if (awayScore !== undefined) {
        updates.push(`away_score = $${idx++}`);
        params.push(awayScore);
      }
      if (updates.length === 0)
        return res.status(400).json({ error: "No updates provided" });

      params.push(matchId);
      await query(
        `UPDATE tournament_matches SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${idx}`,
        params,
      );

      // Notify club owner & teams
      const m = await query(
        "SELECT event_id, home_team_id, away_team_id FROM tournament_matches WHERE id = $1",
        [matchId],
      );
      if (m.rows.length > 0) {
        const eventId = m.rows[0].event_id;
        const ev = await query(
          "SELECT title, club_id, event_date FROM events WHERE id = $1",
          [eventId],
        );
        const eventTitle = ev.rows[0]?.title || "Match";
        const clubId = ev.rows[0]?.club_id;

        // Gather recipients: club owner + team members
        const recipients = [];
        if (clubId) {
          const ownerRes = await query(
            "SELECT owner_id FROM organizations WHERE id = $1",
            [clubId],
          );
          const ownerId = ownerRes.rows[0]?.owner_id;
          if (ownerId) {
            const u = await query(
              "SELECT email, first_name FROM users WHERE id = $1",
              [ownerId],
            );
            if (u.rows.length) recipients.push(u.rows[0]);
          }
        }

        // Team members (home)
        for (const tId of [m.rows[0].home_team_id, m.rows[0].away_team_id]) {
          if (!tId) continue;
          const teamRes = await query(
            "SELECT internal_team_id, team_name FROM tournament_teams WHERE id = $1",
            [tId],
          );
          const internalTeamId = teamRes.rows[0]?.internal_team_id;
          if (internalTeamId) {
            const members = await query(
              `SELECT u.email, u.first_name FROM team_players tp JOIN players p ON tp.player_id = p.id JOIN users u ON p.user_id = u.id WHERE tp.team_id = $1`,
              [internalTeamId],
            );
            recipients.push(...members.rows);
          }
        }

        // De-duplicate emails
        const seen = new Set();
        for (const r of recipients) {
          if (!r || !r.email) continue;
          if (seen.has(r.email)) continue;
          seen.add(r.email);
          try {
            await emailService.sendEventReminderEmail({
              email: r.email,
              firstName: r.first_name || "",
              eventTitle: eventTitle,
              eventDate: ev.rows[0]?.event_date,
              eventTime: "",
              location: "",
              teamName: "",
              clubName: "",
              leadTime: "Live update",
            });
          } catch (e) {
            console.warn(
              "Failed to send live update email to",
              r.email,
              e.message,
            );
          }
        }
      }

      res.json({ message: "Live update applied" });
    } catch (err) {
      console.error("Live update failed", err);
      res.status(500).json({ error: "Failed to apply live update" });
    }
  },
);

module.exports = router;
