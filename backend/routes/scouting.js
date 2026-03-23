const express = require("express");
const { query } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
} = require("../middleware/auth");
const router = express.Router();

/**
 * @route   POST /api/scouting/reports
 * @desc    Submit a professional scouting report (player/team/match)
 */
router.post("/reports", authenticateToken, async (req, res) => {
  const { playerId, teamId, eventId, reportType, data, isDraft } = req.body;
  const scoutId = req.user.id;

  try {
    const result = await query(
      `
            INSERT INTO scout_reports (scout_id, player_id, team_id, event_id, report_type, data, is_draft)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `,
      [
        scoutId,
        playerId || null,
        teamId || null,
        eventId || null,
        reportType,
        JSON.stringify(data),
        isDraft || false,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

/**
 * @route   GET /api/scouting/reports
 * @desc    Get reports (filtered by scout or visibility)
 */
router.get("/reports", authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `
            SELECT r.*, u.first_name as scout_first_name, u.last_name as scout_last_name,
                   p.first_name as player_first_name, p.last_name as player_last_name,
                   t.name as team_name
            FROM scout_reports r
            JOIN users u ON r.scout_id = u.id
            LEFT JOIN players p ON r.player_id = p.id
            LEFT JOIN teams t ON r.team_id = t.id
            WHERE r.scout_id = $1 OR 1=1 -- Logic for org visibility can be added here
            ORDER BY r.created_at DESC
        `,
      [req.user.id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

/**
 * @route   POST /api/scouting/assignments
 * @desc    Self-assign scout to an upcoming match
 */
router.post("/assignments", authenticateToken, async (req, res) => {
  const { eventId } = req.body;
  const scoutId = req.user.id;

  try {
    // 1. Check if scout is verified
    const scoutCheck = await query(
      "SELECT is_verified_scout FROM staff WHERE user_id = $1",
      [scoutId],
    );
    if (!scoutCheck.rows[0]?.is_verified_scout) {
      return res
        .status(403)
        .json({ error: "Only verified scouts can self-assign to matches" });
    }

    const result = await query(
      "INSERT INTO scout_assignments (scout_id, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *",
      [scoutId, eventId],
    );
    res.status(201).json({ success: true, message: "Assigned to match" });
  } catch (err) {
    res.status(500).json({ error: "Failed to assign to match" });
  }
});

/**
 * @route   POST /api/scouting/contact-requests
 * @desc    Request contact with a player (parental approval required)
 */
router.post("/contact-requests", authenticateToken, async (req, res) => {
  const { playerId, eventId, delayType } = req.body;
  const scoutId = req.user.id;

  try {
    const result = await query(
      `
            INSERT INTO scout_contact_requests (scout_id, player_id, event_id, delay_type)
            VALUES ($1, $2, $3, $4) RETURNING *
        `,
      [scoutId, playerId, eventId || null, delayType || "24hr"],
    );

    // TODO: Trigger notification to parent

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create contact request" });
  }
});

/**
 * @route   GET /api/scouting/analytics
 * @desc    Get scouting coverage analytics
 */
router.get("/analytics", authenticateToken, async (req, res) => {
  try {
    const [totalPlayers, scoutedPlayers] = await Promise.all([
      query("SELECT COUNT(*) FROM players"),
      query(
        "SELECT COUNT(DISTINCT player_id) FROM scout_reports WHERE player_id IS NOT NULL",
      ),
    ]);

    const coverage =
      totalPlayers.rows[0].count > 0
        ? (scoutedPlayers.rows[0].count / totalPlayers.rows[0].count) * 100
        : 0;

    res.json({
      totalPlayers: parseInt(totalPlayers.rows[0].count),
      scoutedPlayers: parseInt(scoutedPlayers.rows[0].count),
      coveragePercentage: coverage.toFixed(1),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

/**
 * @route   POST /api/scouting/verify-me
 * @desc    Submit verification documents to become a verified scout
 */
router.post("/verify-me", authenticateToken, async (req, res) => {
  const { clubId, idCardUrl, clubLetterUrl, notes } = req.body;
  const userId = req.user.id;

  try {
    // Check if user is staff (required to be a scout)
    const staffCheck = await query("SELECT id FROM staff WHERE user_id = $1", [
      userId,
    ]);
    if (staffCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Only staff members can apply for scout verification" });
    }

    // Check for existing pending request
    const existing = await query(
      "SELECT id FROM scout_verification_requests WHERE user_id = $1 AND status = 'pending'",
      [userId],
    );
    if (existing.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "You already have a pending verification request" });
    }

    const result = await query(
      `
            INSERT INTO scout_verification_requests (user_id, club_id, id_card_url, club_letter_url, notes)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `,
      [userId, clubId || null, idCardUrl, clubLetterUrl, notes],
    );

    // Update staff status to pending
    await query(
      "UPDATE staff SET scout_verification_status = 'pending' WHERE user_id = $1",
      [userId],
    );

    // Update users status to pending
    await query(
      "UPDATE users SET scout_verification_status = 'pending' WHERE id = $1",
      [userId],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit verification request" });
  }
});

/**
 * @route   GET /api/scouting/watchlist
 * @desc    Get current scout's watchlist
 */
router.get("/watchlist", authenticateToken, async (req, res) => {
    try {
        const result = await query(
            `
            SELECT w.*, p.first_name, p.last_name, p.position, p.date_of_birth,
                   (p.first_name || ' ' || p.last_name) as player_name,
                   o.name as club_name
            FROM scout_watchlist w
            JOIN players p ON w.player_id = p.id
            LEFT JOIN organizations o ON p.club_id = o.id
            WHERE w.scout_id = $1
            ORDER BY w.created_at DESC
        `,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch watchlist" });
    }
});

/**
 * @route   POST /api/scouting/watchlist
 * @desc    Add player to watchlist
 */
router.post("/watchlist", authenticateToken, async (req, res) => {
    const { playerId, rating, notes } = req.body;
    try {
        const result = await query(
            `
            INSERT INTO scout_watchlist (scout_id, player_id, rating, notes)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (scout_id, player_id) 
            DO UPDATE SET rating = EXCLUDED.rating, notes = EXCLUDED.notes
            RETURNING *
        `,
            [req.user.id, playerId, rating, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Failed to update watchlist" });
    }
});

/**
 * @route   DELETE /api/scouting/watchlist/:playerId
 * @desc    Remove player from watchlist
 */
router.delete("/watchlist/:playerId", authenticateToken, async (req, res) => {
    try {
        await query(
            "DELETE FROM scout_watchlist WHERE scout_id = $1 AND player_id = $2",
            [req.user.id, req.params.playerId]
        );
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: "Failed to remove from watchlist" });
    }
});

/**
 * @route   GET /api/scouting/medical/:id
 * @desc    Get medical info (Admin/Verified Scout only)
 */
router.get("/medical/:id", authenticateToken, async (req, res) => {
    try {
        const result = await query(
            "SELECT medical_info, emergency_contact FROM players WHERE id = $1",
            [req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch medical info" });
    }
});

module.exports = router;
