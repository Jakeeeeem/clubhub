const express = require("express");
const { query, withTransaction } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
} = require("../middleware/auth");
const router = express.Router();
const { body, validationResult } = require("express-validator");

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
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { eventId, teamName, contactEmail, contactPhone, internalTeamId } =
        req.body;

      const result = await query(
        `
            INSERT INTO tournament_teams (event_id, team_name, contact_email, contact_phone, internal_team_id, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING *
        `,
        [eventId, teamName, contactEmail, contactPhone, internalTeamId || null],
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
          "SELECT * FROM tournament_matches WHERE event_id = $1 ORDER BY start_time, match_number",
          [eventId],
        ),
        query(
          "SELECT * FROM tournament_groups WHERE stage_id IN (SELECT id FROM tournament_stages WHERE event_id = $1)",
          [eventId],
        ),
      ]);

      res.json({
        event: event.rows[0],
        teams: teams.rows,
        stages: stages.rows,
        matches: matches.rows,
        groups: groups.rows,
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
          'SELECT * FROM tournament_teams WHERE event_id = $1 AND status = "approved"';
        let teamsParams = [eventId];
        if (groupId) {
          teamsQuery += " AND current_group_id = $2";
          teamsParams.push(groupId);
        }

        // Fix: Use correct quoting for status and group check
        teamsQuery = teamsQuery.replace(/"/g, "'");

        const teamsRes = await client.query(teamsQuery, teamsParams);
        const teams = teamsRes.rows;

        if (teams.length < 2) throw new Error("Not enough teams");

        if (type === "knockout") {
          // Shuffle
          for (let i = teams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teams[i], teams[j]] = [teams[j], teams[i]];
          }

          for (let i = 0; i < teams.length; i += 2) {
            const home = teams[i];
            const away = teams[i + 1];

            await client.query(
              `
                        INSERT INTO tournament_matches (stage_id, event_id, home_team_id, away_team_id, round_number, match_number, status)
                        VALUES ($1, $2, $3, $4, 1, $5, 'scheduled')
                    `,
              [stageId, eventId, home.id, away ? away.id : null, i / 2],
            );
          }
        } else if (type === "league") {
          // Round Robin
          for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
              await client.query(
                `
                            INSERT INTO tournament_matches (stage_id, event_id, home_team_id, away_team_id, status)
                            VALUES ($1, $2, $3, $4, 'scheduled')
                        `,
                [stageId, eventId, teams[i].id, teams[j].id],
              );
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
          "SELECT id FROM tournament_matches WHERE stage_id = $1 AND start_time IS NULL ORDER BY match_number",
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
          // Find pitch that is available earliest
          let earliestPitchIdx = 0;
          for (let j = 1; j < pitchAvailability.length; j++) {
            if (pitchAvailability[j] < pitchAvailability[earliestPitchIdx]) {
              earliestPitchIdx = j;
            }
          }

          const matchStartTime = new Date(pitchAvailability[earliestPitchIdx]);
          const matchEndTime = new Date(
            matchStartTime.getTime() + duration * 60000,
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
            matchStartTime.getTime() + totalSlot * 60000,
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
      await query("UPDATE tournament_teams SET status = $1 WHERE id = $2", [
        status,
        req.params.id,
      ]);
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
               ht.team_name as home_name, 
               at.team_name as away_name,
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

module.exports = router;
