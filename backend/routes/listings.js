const express = require("express");
const router = express.Router();
const { query, withTransaction } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
} = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const emailService = require("../services/email-service");

/**
 * @route GET /api/listings
 * @desc Get all active listings (with optional filters)
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { clubId, type, position, teamId } = req.query;

    let queryText = `
      SELECT l.*, c.name as club_name, t.name as team_name,
             (SELECT COUNT(*) FROM listing_applications WHERE listing_id = l.id) as application_count
      FROM listings l
      JOIN clubs c ON l.club_id = c.id
      LEFT JOIN teams t ON l.team_id = t.id
      WHERE l.is_active = true
    `;
    const queryParams = [];
    let paramCount = 0;

    if (clubId) {
      paramCount++;
      queryText += ` AND l.club_id = $${paramCount}`;
      queryParams.push(clubId);
    } else {
      // Enforce Isolation: If no clubId, limit to user's clubs context
      paramCount++;
      queryText += ` AND l.club_id IN (
          SELECT id FROM clubs WHERE owner_id = $${paramCount}
          UNION
          SELECT club_id FROM staff WHERE user_id = $${paramCount}
          UNION
          SELECT club_id FROM players WHERE user_id = $${paramCount}
      )`;
      queryParams.push(req.user.id);
    }

    if (type) {
      paramCount++;
      queryText += ` AND l.listing_type = $${paramCount}`;
      queryParams.push(type);
    }

    if (position) {
      paramCount++;
      queryText += ` AND l.position ILIKE $${paramCount}`;
      queryParams.push(`%${position}%`);
    }

    // Coach Scoping: If user is a coach, limit them to their team's listings
    const staffCheck = await query(
      "SELECT id, role FROM staff WHERE user_id = $1",
      [req.user.id],
    );
    if (staffCheck.rows.length > 0 && staffCheck.rows[0].role === "coach") {
      const coachId = staffCheck.rows[0].id;
      queryText += ` AND l.team_id IN (SELECT id FROM teams WHERE coach_id = $${++paramCount})`;
      queryParams.push(coachId);
    }

    queryText += " ORDER BY l.created_at DESC";

    const result = await query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error("Get listings error:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

/**
 * @route POST /api/listings
 * @desc Create a new recruitment listing
 */
router.post(
  "/",
  authenticateToken,
  requireOrganization,
  [
    body("title").trim().notEmpty(),
    body("listing_type").isIn(["player", "staff", "trial", "other"]),
    body("clubId").isUUID(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const {
        title,
        description,
        listing_type,
        position,
        requirements,
        clubId,
        teamId,
      } = req.body;

      const result = await query(
        `INSERT INTO listings (title, description, listing_type, position, requirements, club_id, team_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          title,
          description,
          listing_type,
          position,
          requirements,
          clubId,
          teamId || null,
        ],
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Create listing error:", error);
      res.status(500).json({ error: "Failed to create listing" });
    }
  },
);

/**
 * @route GET /api/listings/:id/applications
 * @desc Get all applications for a listing
 */
router.get(
  "/:id/applications",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.query;

      let queryText = `
      SELECT la.*, u.first_name, u.last_name, u.email, u.phone, 
             up.date_of_birth as dob, up.experience_level as experience
      FROM listing_applications la
      JOIN users u ON la.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE la.listing_id = $1
    `;
      const queryParams = [id];

      // Coach Scoping: If user is a coach, ensure they can only see applications for their team
      const staffCheck = await query(
        "SELECT id, role FROM staff WHERE user_id = $1",
        [req.user.id],
      );
      if (staffCheck.rows.length > 0 && staffCheck.rows[0].role === "coach") {
        const coachId = staffCheck.rows[0].id;
        const listingCheck = await query(
          "SELECT team_id FROM listings WHERE id = $1",
          [id],
        );
        if (listingCheck.rows.length > 0) {
          const teamId = listingCheck.rows[0].team_id;
          const ownershipCheck = await query(
            "SELECT id FROM teams WHERE id = $1 AND coach_id = $2",
            [teamId, coachId],
          );
          if (ownershipCheck.rows.length === 0) {
            return res
              .status(403)
              .json({
                error:
                  "Access denied: You are not the coach for this listing's team",
              });
          }
        }
      }

      if (status) {
        queryText += ` AND la.status = $2`;
        queryParams.push(status);
      }

      queryText += ` ORDER BY la.created_at DESC`;

      const result = await query(queryText, queryParams);

      res.json(result.rows);
    } catch (error) {
      console.error("Get applications error:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  },
);

/**
 * @route PUT /api/listings/applications/:id/status
 * @desc Update application status (shortlist, reject, accept, invited)
 */
router.put(
  "/applications/:id/status",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body; // pending, shortlisted, rejected, accepted, invited

      if (
        !["pending", "shortlisted", "rejected", "accepted", "invited"].includes(
          status,
        )
      ) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const result = await query(
        `UPDATE listing_applications SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, id],
      );

      if (result.rows.length === 0)
        return res.status(404).json({ error: "Application not found" });

      const application = result.rows[0];

      // 📧 Send Automation Email for Status Updates
      try {
        const userRes = await query(
          "SELECT email, first_name FROM users WHERE id = $1",
          [application.user_id],
        );
        const listingRes = await query(
          `
        SELECT l.title, c.name as club_name 
        FROM listings l 
        JOIN clubs c ON l.club_id = c.id 
        WHERE l.id = $1
      `,
          [application.listing_id],
        );

        if (userRes.rows.length > 0 && listingRes.rows.length > 0) {
          const { email, first_name } = userRes.rows[0];
          const { title, club_name } = listingRes.rows[0];

          await emailService.sendApplicationUpdateEmail({
            email,
            firstName: first_name,
            clubName: club_name,
            status: status,
            listingTitle: title,
          });
        }
      } catch (emailErr) {
        console.error(
          "Failed to send application status email:",
          emailErr.message,
        );
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update application status error:", error);
      res.status(500).json({ error: "Failed to update application status" });
    }
  },
);

/**
 * @route POST /api/listings/applications/:id/invite
 * @desc Invite an accepted applicant to the team
 */
router.post(
  "/applications/:id/invite",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { teamId } = req.body;

      // 1. Update status to 'invited'
      const result = await query(
        `UPDATE listing_applications SET status = 'invited', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id],
      );

      if (result.rows.length === 0)
        return res.status(404).json({ error: "Application not found" });

      const app = result.rows[0];

      // 2. Fetch user details and club details for email
      try {
        const userRes = await query(
          "SELECT email, first_name FROM users WHERE id = $1",
          [app.user_id],
        );
        const clubRes = await query(
          `
        SELECT c.name, c.id as club_id, u.first_name || ' ' || u.last_name as inviter_name
        FROM listings l
        JOIN clubs c ON l.club_id = c.id
        JOIN users u ON c.owner_id = u.id
        WHERE l.id = $1
      `,
          [app.listing_id],
        );

        if (userRes.rows.length > 0 && clubRes.rows.length > 0) {
          const { email, first_name } = userRes.rows[0];
          const { name, inviter_name, club_id } = clubRes.rows[0];

          // Generate invitation token (using simple approach or existing invitations table)
          // For consistency with invitations route, we could create an entry there,
          // but for now we'll send a direct "Welcome & Dashboard" link since they already have an account.

          await emailService.sendApplicationUpdateEmail({
            email,
            firstName: first_name,
            clubName: name,
            status: "invited",
            listingTitle: "Team Placement",
          });
        }
      } catch (emailErr) {
        console.error("Failed to send team invite email:", emailErr.message);
      }

      res.json({ message: "Invitation sent", application: result.rows[0] });
    } catch (error) {
      console.error("Invite applicant error:", error);
      res.status(500).json({ error: "Failed to send invitation" });
    }
  },
);

/**
 * @route DELETE /api/listings/:id
 * @desc Delete (deactivate) a listing
 */
router.delete(
  "/:id",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await query(
        "UPDATE listings SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *",
        [id],
      );

      if (result.rows.length === 0)
        return res.status(404).json({ error: "Listing not found" });

      res.json({ message: "Listing deleted successfully" });
    } catch (error) {
      console.error("Delete listing error:", error);
      res.status(500).json({ error: "Failed to delete listing" });
    }
  },
);

module.exports = router;
