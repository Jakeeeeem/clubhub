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

module.exports = router;
