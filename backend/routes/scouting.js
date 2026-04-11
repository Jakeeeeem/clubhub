const express = require("express");
const { query } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
} = require("../middleware/auth");
const emailService = require("../services/email-service");
const router = express.Router();

// Helper - calculate age
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

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
 * @desc    Request contact with a player (parental approval required for minors)
 */
router.post("/contact-requests", authenticateToken, async (req, res) => {
  const { playerId, eventId, delayType } = req.body;
  const scoutId = req.user.id;

  try {
    // 1. Get player age and owner (parent) info
    const playerResult = await query(
      `SELECT p.date_of_birth, p.user_id FROM players p WHERE p.id = $1`,
      [playerId],
    );

    if (playerResult.rows.length === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    const player = playerResult.rows[0];
    const age = calculateAge(player.date_of_birth);
    const isMinor = age < 18;

    let finalDelayType = delayType || "24hr";
    let status = "pending";

    if (isMinor) {
      finalDelayType = "parental_approval_required";
      console.log(
        `🛡️ Parental Gating Triggered: Player ${playerId} is a minor (${age}).`,
      );
    }

    // 2. Insert request (if minor create an approval token & expiry)
    let insertResult;
    if (isMinor) {
      insertResult = await query(
        `
            INSERT INTO scout_contact_requests (scout_id, player_id, event_id, delay_type, status, approval_token, approval_expires_at)
            VALUES ($1, $2, $3, $4, $5, gen_random_uuid(), NOW() + INTERVAL '14 days') RETURNING *
        `,
        [scoutId, playerId, eventId || null, finalDelayType, status],
      );
    } else {
      insertResult = await query(
        `
            INSERT INTO scout_contact_requests (scout_id, player_id, event_id, delay_type, status)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `,
        [scoutId, playerId, eventId || null, finalDelayType, status],
      );
    }

    const request = insertResult.rows[0];

    // 3. Notify player (or parent as recorded by players.user_id)
    const targetUserId = player.user_id;
    if (targetUserId) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, link) 
             VALUES ($1, $2, $3, $4, $5)`,
        [
          targetUserId,
          isMinor ? "Parental Approval Required" : "Scouting Contact Request",
          isMinor
            ? "A verified scout has requested contact with your child. Please review and approve in your dashboard."
            : "A verified scout has requested to contact you regarding a recent performance.",
          "scouting",
          "player-dashboard.html?section=notifications",
        ],
      );
    }

    // 4. Send parental approval email for minors (non-blocking)
    if (isMinor) {
      try {
        // get parent email and names
        const parentRes = await query(
          "SELECT email, first_name FROM users WHERE id = $1",
          [player.user_id],
        );
        if (parentRes.rows.length > 0 && parentRes.rows[0].email) {
          const parentEmail = parentRes.rows[0].email;
          const parentFirst = parentRes.rows[0].first_name || "";

          // scout info
          const scoutInfo = await query(
            "SELECT first_name, last_name FROM users WHERE id = $1",
            [scoutId],
          );
          const scoutName =
            scoutInfo.rows[0] &&
            (scoutInfo.rows[0].first_name || scoutInfo.rows[0].last_name)
              ? `${scoutInfo.rows[0].first_name || ""} ${scoutInfo.rows[0].last_name || ""}`.trim()
              : "A scout";

          // player name
          const playerInfo = await query(
            "SELECT first_name, last_name FROM players WHERE id = $1",
            [playerId],
          );
          const playerName = playerInfo.rows[0]
            ? `${playerInfo.rows[0].first_name || ""} ${playerInfo.rows[0].last_name || ""}`.trim()
            : "your child";

          const frontendBase =
            process.env.FRONTEND_URL || "http://localhost:8000";
          const approvalLink = `${frontendBase}/parent-approval.html?token=${request.approval_token}&req=${request.id}`;
          const denyLink = `${frontendBase}/parent-approval.html?token=${request.approval_token}&req=${request.id}&action=deny`;

          // Use the centralized email helper to send the parental approval request
          await emailService
            .sendParentalApprovalEmail({
              to: parentEmail,
              parentFirstName: parentFirst,
              scoutName,
              playerName,
              approvalLink,
              denyLink,
            })
            .catch((e) => console.error("Parental email error:", e));
        }
      } catch (e) {
        console.error("Failed to send parental approval email:", e);
      }
    }

    res.status(201).json({
      ...request,
      requires_parental_approval: isMinor,
    });
  } catch (err) {
    console.error("Scouting contact error:", err);
    res.status(500).json({ error: "Failed to create contact request" });
  }
});

// Parent: list pending contact requests for their children
router.get("/contact-requests/pending", authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT scr.*, p.first_name as player_first_name, p.last_name as player_last_name, u.first_name as scout_first_name, u.last_name as scout_last_name
         FROM scout_contact_requests scr
         JOIN players p ON scr.player_id = p.id
         JOIN users u ON scr.scout_id = u.id
         WHERE scr.status = 'pending' AND (p.user_id = $1)
         ORDER BY scr.created_at DESC`,
      [req.user.id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pending contact requests" });
  }
});

// Get status for a given contact request
router.get(
  "/contact-requests/:id/status",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await query(
        "SELECT * FROM scout_contact_requests WHERE id = $1",
        [req.params.id],
      );
      if (result.rows.length === 0)
        return res.status(404).json({ error: "Request not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch request status" });
    }
  },
);

// Parent approves a contact request
router.post(
  "/contact-requests/:id/approve",
  authenticateToken,
  async (req, res) => {
    try {
      const reqResult = await query(
        `SELECT scr.*, p.user_id as player_owner FROM scout_contact_requests scr JOIN players p ON scr.player_id = p.id WHERE scr.id = $1`,
        [req.params.id],
      );
      if (reqResult.rows.length === 0)
        return res.status(404).json({ error: "Request not found" });

      const record = reqResult.rows[0];
      // only the player's owner (parent) may approve
      if (req.user.id !== record.player_owner) {
        return res.status(403).json({ error: "Not authorized to approve" });
      }

      if (record.status !== "pending") {
        return res.status(400).json({ error: "Request is not pending" });
      }

      await query(
        `UPDATE scout_contact_requests SET status = 'approved', parent_response_at = NOW(), contact_info_revealed_at = NOW() WHERE id = $1`,
        [req.params.id],
      );

      // Notify scout
      await query(
        `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
        [
          record.scout_id,
          "Scouting Contact Approved",
          `Your contact request for player has been approved by the parent.`,
          "scouting",
          "scouting.html",
        ],
      );

      res.json({ success: true, message: "Request approved" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to approve request" });
    }
  },
);

// Parent denies a contact request
router.post(
  "/contact-requests/:id/deny",
  authenticateToken,
  async (req, res) => {
    try {
      const { reason } = req.body;
      const reqResult = await query(
        `SELECT scr.*, p.user_id as player_owner FROM scout_contact_requests scr JOIN players p ON scr.player_id = p.id WHERE scr.id = $1`,
        [req.params.id],
      );
      if (reqResult.rows.length === 0)
        return res.status(404).json({ error: "Request not found" });

      const record = reqResult.rows[0];
      if (req.user.id !== record.player_owner) {
        return res.status(403).json({ error: "Not authorized to deny" });
      }

      if (record.status !== "pending") {
        return res.status(400).json({ error: "Request is not pending" });
      }

      await query(
        `UPDATE scout_contact_requests SET status = 'declined', parent_response_at = NOW(), deny_reason = $2 WHERE id = $1`,
        [req.params.id, reason || null],
      );

      // Notify scout
      await query(
        `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
        [
          record.scout_id,
          "Scouting Contact Declined",
          `Your contact request for player has been declined by the parent.`,
          "scouting",
          "scouting.html",
        ],
      );

      res.json({ success: true, message: "Request denied" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to deny request" });
    }
  },
);

// Public: fetch request details by token (for parent UI)
router.get("/contact-requests/by-token", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "token required" });

    const result = await query(
      `SELECT scr.*, p.first_name as player_first_name, p.last_name as player_last_name, u.first_name as scout_first_name, u.last_name as scout_last_name
       FROM scout_contact_requests scr
       JOIN players p ON scr.player_id = p.id
       LEFT JOIN users u ON scr.scout_id = u.id
       WHERE scr.approval_token = $1 LIMIT 1`,
      [token],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Request not found" });
    const row = result.rows[0];
    // hide token in response
    delete row.approval_token;
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch request by token" });
  }
});

// Public: approve via token (POST)
router.post("/contact-requests/approve-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "token required" });

    const reqResult = await query(
      "SELECT scr.*, p.user_id as player_owner FROM scout_contact_requests scr JOIN players p ON scr.player_id = p.id WHERE scr.approval_token = $1 LIMIT 1",
      [token],
    );
    if (reqResult.rows.length === 0)
      return res.status(404).json({ error: "Request not found" });

    const record = reqResult.rows[0];
    if (record.status !== "pending")
      return res.status(400).json({ error: "Request is not pending" });
    if (
      record.approval_expires_at &&
      new Date(record.approval_expires_at) < new Date()
    ) {
      return res.status(400).json({ error: "Token expired" });
    }

    await query(
      `UPDATE scout_contact_requests SET status = 'approved', parent_response_at = NOW(), contact_info_revealed_at = NOW() WHERE id = $1`,
      [record.id],
    );

    // Notify scout
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
      [
        record.scout_id,
        "Scouting Contact Approved",
        `Your contact request for a player has been approved by the parent.`,
        "scouting",
        "scouting.html",
      ],
    );

    res.json({ success: true, message: "Request approved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve request via token" });
  }
});

// Public: deny via token (POST)
router.post("/contact-requests/deny-token", async (req, res) => {
  try {
    const { token, reason } = req.body;
    if (!token) return res.status(400).json({ error: "token required" });

    const reqResult = await query(
      "SELECT scr.*, p.user_id as player_owner FROM scout_contact_requests scr JOIN players p ON scr.player_id = p.id WHERE scr.approval_token = $1 LIMIT 1",
      [token],
    );
    if (reqResult.rows.length === 0)
      return res.status(404).json({ error: "Request not found" });

    const record = reqResult.rows[0];
    if (record.status !== "pending")
      return res.status(400).json({ error: "Request is not pending" });
    if (
      record.approval_expires_at &&
      new Date(record.approval_expires_at) < new Date()
    ) {
      return res.status(400).json({ error: "Token expired" });
    }

    await query(
      `UPDATE scout_contact_requests SET status = 'declined', parent_response_at = NOW(), deny_reason = $2 WHERE id = $1`,
      [record.id, reason || null],
    );

    // Notify scout
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)`,
      [
        record.scout_id,
        "Scouting Contact Declined",
        `Your contact request for a player has been declined by the parent.`,
        "scouting",
        "scouting.html",
      ],
    );

    res.json({ success: true, message: "Request denied" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to deny request via token" });
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
      [req.user.id],
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
      [req.user.id, playerId, rating, notes],
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
      [req.user.id, req.params.playerId],
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
      "SELECT id, date_of_birth, medical_info, emergency_contact, user_id FROM players WHERE id = $1",
      [req.params.id],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Player not found" });

    const player = result.rows[0];
    const age = calculateAge(player.date_of_birth);
    const isMinor = age < 18;

    // If minor and requesting user is a verified scout then require approval
    if (isMinor) {
      const scoutCheck = await query(
        "SELECT is_verified_scout FROM staff WHERE user_id = $1",
        [req.user.id],
      );

      const isScout =
        scoutCheck.rows.length > 0 && scoutCheck.rows[0].is_verified_scout;
      if (isScout && req.user.id !== player.user_id) {
        const approved = await query(
          "SELECT 1 FROM scout_contact_requests WHERE scout_id = $1 AND player_id = $2 AND status = 'approved' LIMIT 1",
          [req.user.id, req.params.id],
        );

        if (approved.rows.length === 0) {
          return res.status(403).json({
            error: "Parental approval required to view medical details",
          });
        }
      }
    }

    res.json({
      medical_info: player.medical_info,
      emergency_contact: player.emergency_contact,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch medical info" });
  }
});

module.exports = router;
