const express = require("express");
const { query, queries, withTransaction } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
  optionalAuth,
} = require("../middleware/auth");
const emailService = require("../services/email-service");
const { body, validationResult } = require("express-validator");
const crypto = require("crypto");
const cors = require("cors");

const router = express.Router();

const inviteValidation = [
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("firstName").optional().trim(),
  body("lastName").optional().trim(),
  body("dateOfBirth")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Please provide a valid date of birth"), // 🔥 NEW
  body("message").optional().trim(),
  body("clubRole")
    .optional()
    .isIn([
      "player",
      "parent",
      "coach",
      "assistant_coach",
      "staff",
      "admin",
      "viewer",
      "manager",
    ])
    .withMessage("Invalid club role"),
  body("teamId")
    .optional({ checkFalsy: true }) // Allow empty string, null, undefined
    .isUUID()
    .withMessage("Invalid team ID"),
];

// 🔥 GENERATE SHAREABLE CLUB INVITE LINK
router.post(
  "/generate",
  authenticateToken,
  requireOrganization,
  inviteValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const {
        email = null,
        firstName = "",
        lastName = "",
        dateOfBirth = null, // 🔥 NEW
        message = "",
        clubRole = "player",
        clubId,
        teamId = null,
        isPublic = true,
      } = req.body;

      // Get user's club
      let userClubId = clubId;
      if (!userClubId) {
        const clubResult = await query(
          "SELECT id, name FROM organizations WHERE owner_id = $1 LIMIT 1",
          [req.user.id],
        );
        if (clubResult.rows.length === 0) {
          return res.status(404).json({
            error: "No club found",
            message: "You must have a club to send invites",
          });
        }
        userClubId = clubResult.rows[0].id;
      }

      // Verify user has permission (Owner or Admin)
      const permissionResult = await query(
        `
      SELECT c.*, om.role as requester_role
      FROM organizations c
      JOIN organization_members om ON c.id = om.organization_id
      WHERE c.id = $1 AND om.user_id = $2 AND om.status = 'active'
    `,
        [userClubId, req.user.id],
      );

      if (permissionResult.rows.length === 0) {
        return res.status(403).json({
          error: "Access denied",
          message: "You are not a member of this club",
        });
      }

      const club = permissionResult.rows[0];
      const requesterRole = club.requester_role;

      // Role-based restrictions
      if (!["owner", "admin", "coach"].includes(requesterRole)) {
        return res.status(403).json({
          error: "Permission denied",
          message: "You do not have permission to send invites",
        });
      }

      // Coaches can only invite players
      if (requesterRole === "coach" && clubRole !== "player") {
        return res.status(403).json({
          error: "Permission denied",
          message: "Coaches can only invite players",
        });
      }

      // Verify team belongs to club if specified
      if (teamId) {
        const teamResult = await query(
          "SELECT id FROM teams WHERE id = $1 AND club_id = $2",
          [teamId, userClubId],
        );
        if (teamResult.rows.length === 0) {
          return res.status(400).json({
            error: "Invalid team",
            message: "Team not found or does not belong to your club",
          });
        }
      }

      // For shareable invites, use a timestamp-based email
      const inviteEmail = isPublic
        ? `invite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${club.name.toLowerCase().replace(/\s+/g, "")}.clubhub`
        : email;

      // Check if specific email invite already exists (only for non-public invites)
      if (!isPublic && email) {
        const existingInvite = await query(
          `
        SELECT id, status as invite_status FROM invitations 
        WHERE email = $1 AND organization_id = $2 AND status = 'pending'
      `,
          [email, userClubId],
        );

        if (existingInvite.rows.length > 0) {
          return res.status(409).json({
            error: "Invite already sent",
            message: "An active invite already exists for this email",
          });
        }

        // Check if user is already a member
        const existingMember = await query(
          `
        SELECT id FROM players WHERE email = $1 AND club_id = $2
      `,
          [email, userClubId],
        );

        if (existingMember.rows.length > 0) {
          return res.status(409).json({
            error: "Already a member",
            message: "This person is already a member of your club",
          });
        }
      }

      // Generate secure invite token
      const inviteToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year for shareable links

      // Create invite record
      const inviteResult = await query(
        `
      INSERT INTO invitations (
        email, 
        first_name, 
        last_name, 
        date_of_birth,
        organization_id, 
        invited_by, 
        role, 
        token, 
        expires_at, 
        message,
        team_id,
        is_public,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
      RETURNING *, token as invite_token, role as club_role
    `,
        [
          inviteEmail,
          firstName || null,
          lastName || null,
          dateOfBirth || null, // 🔥 NEW
          userClubId,
          req.user.id,
          clubRole,
          inviteToken,
          expiresAt,
          message || `Join ${club.name} - a great sports club!`,
          teamId || null,
          isPublic,
        ],
      );

      const invite = inviteResult.rows[0];

      // Generate invite link
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      const inviteLink = `${baseUrl}/invite.html?token=${inviteToken}`;

      console.log(
        `📧 ${isPublic ? "Shareable" : "Email"} invite generated for ${club.name}`,
      );
      console.log(`🔗 Invite link: ${inviteLink}`);

      // 🔥 SEND EMAIL INVITE IF NOT PUBLIC
      if (!isPublic && email) {
        try {
          await emailService.sendClubInviteEmail({
            email: email,
            clubName: club.name,
            inviterName:
              `${req.user.first_name || "Club Admin"} ${req.user.last_name || ""}`.trim(),
            inviteLink: inviteLink,
            personalMessage: message,
            clubRole: clubRole,
          });
          console.log(`✅ Email sent to ${email}`);
        } catch (emailError) {
          console.error("❌ Failed to send invite email:", emailError);
          // Don't fail the request if email fails, but return a warning?
          // For now, we just log it. The invite is created/token generated regardless.
        }
      }

      res.status(201).json({
        message: "Club invite generated successfully",
        invite: {
          id: invite.id,
          email: isPublic ? null : invite.email,
          clubName: club.name,
          clubRole: invite.club_role,
          expiresAt: invite.expires_at,
          inviteLink: inviteLink,
          hasTeamAssignment: !!teamId,
          isPublic: isPublic,
          isShareable: true,
        },
        inviteLink: inviteLink,
        success: true,
      });
    } catch (error) {
      console.error("Generate invite error:", error);
      res.status(500).json({
        error: "Failed to generate invite",
        message: "An unexpected error occurred while generating the invite",
      });
    }
  },
);

// 🔥 GET INVITE DETAILS (PUBLIC)
router.get("/details/:token", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        error: "Invite token is required",
      });
    }

    // Get invite details with team information
    const inviteResult = await query(
      `
      SELECT ci.*, c.name as club_name, c.description as club_description, 
       c.location as club_location, c.sport as club_sport,
       u.first_name as inviter_first_name, u.last_name as inviter_last_name,
       t.name as team_name,
       ci.token as invite_token, ci.status as invite_status, ci.organization_id as club_id,
       ci.message as personal_message
FROM invitations ci
JOIN organizations c ON ci.organization_id::text = c.id::text
JOIN users u ON ci.invited_by::text = u.id::text
LEFT JOIN teams t ON ci.team_id::text = t.id::text
WHERE ci.token = $1;
    `,
      [token],
    );

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({
        error: "Invite not found",
        message: "This invite link is invalid or has expired",
      });
    }

    const invite = inviteResult.rows[0];

    // Check if invite has expired
    if (new Date() > new Date(invite.expires_at)) {
      return res.status(410).json({
        error: "Invite expired",
        message: "This invite link has expired",
      });
    }

    // Check if invite is still pending
    if (invite.invite_status !== "pending") {
      return res.status(410).json({
        error: "Invite no longer valid",
        message: `This invite has been ${invite.invite_status}`,
      });
    }

    res.json({
      invite: {
        id: invite.id,
        email: invite.is_public ? null : invite.email,
        firstName: invite.first_name,
        lastName: invite.last_name,
        clubRole: invite.club_role,
        personalMessage: invite.personal_message,
        expiresAt: invite.expires_at,
        isPublic: invite.is_public,
        teamName: invite.team_name,
      },
      club: {
        id: invite.club_id,
        name: invite.club_name,
        description: invite.club_description,
        location: invite.club_location,
        sport: invite.club_sport,
      },
      inviter: {
        name: `${invite.inviter_first_name} ${invite.inviter_last_name}`,
      },
    });
  } catch (error) {
    console.error("Get invite details error:", error);
    res.status(500).json({
      error: "Failed to fetch invite details",
    });
  }
});

// 🔥 ACCEPT CLUB INVITE (WORKS WITH SHAREABLE LINKS)
router.post("/accept/:token", authenticateToken, async (req, res) => {
  try {
    const { token } = req.params;
    const { acceptTerms } = req.body;

    console.log(
      "✅ Processing invite acceptance for token:",
      token.substring(0, 10) + "...",
    );

    if (!token) {
      return res.status(400).json({
        error: "Invite token is required",
      });
    }

    if (!acceptTerms) {
      return res.status(400).json({
        error: "You must accept the terms to join the club",
      });
    }

    // 🔥 FIXED QUERY WITH PROPER TYPE CASTING FOR ACCEPT
    console.log("🔍 Looking up invite for acceptance...");
    const inviteResult = await query(
      `
      SELECT ci.*, c.name as club_name, c.id as club_id, t.name as team_name,
             ci.status as invite_status, ci.organization_id as club_id, ci.token as invite_token
      FROM invitations ci
      JOIN organizations c ON ci.organization_id::text = c.id::text
      LEFT JOIN teams t ON ci.team_id::text = t.id::text
      WHERE ci.token = $1
    `,
      [token],
    );

    console.log("📊 Accept query results:", inviteResult.rows.length);

    if (inviteResult.rows.length === 0) {
      console.log("❌ No invite found for acceptance");
      return res.status(404).json({
        error: "Invite not found",
        message: "This invite link is invalid",
      });
    }

    const invite = inviteResult.rows[0];
    console.log("✅ Found invite:", {
      id: invite.id,
      club_name: invite.club_name,
      invite_status: invite.invite_status,
      is_public: invite.is_public,
    });

    // Check if invite has expired
    if (new Date() > new Date(invite.expires_at)) {
      console.log("⏰ Invite has expired");
      return res.status(410).json({
        error: "Invite expired",
        message: "This invite link has expired",
      });
    }

    // Check if invite is still pending
    if (invite.invite_status !== "pending") {
      console.log("🚫 Invite not pending:", invite.invite_status);
      return res.status(410).json({
        error: "Invite no longer valid",
        message: `This invite has been ${invite.invite_status}`,
      });
    }

    // For non-public invites, check email match
    if (!invite.is_public && req.user.email !== invite.email) {
      console.log("📧 Email mismatch");
      return res.status(403).json({
        error: "Email mismatch",
        message:
          "You must be logged in with the email address that received this invite",
      });
    }

    // 🔥 FIXED CHECK FOR EXISTING MEMBER WITH TYPE CASTING
    console.log("🔍 Checking if user is already a member...");
    const existingMember = await query(
      `
      SELECT id FROM players WHERE user_id::text = $1::text AND club_id::text = $2::text
    `,
      [req.user.id.toString(), invite.club_id.toString()],
    );

    if (existingMember.rows.length > 0) {
      console.log("👥 User is already a member");
      return res.status(409).json({
        error: "Already a member",
        message: "You are already a member of this club",
      });
    }

    console.log("🔄 Starting transaction to accept invite...");

    // Accept invite in transaction with enhanced error handling
    const result = await withTransaction(async (client) => {
      try {
        console.log("👤 Creating/Updating member record...");

        // 1. Add to organization_members (Unified System Core)
        const memberCheck = await client.query(
          `
          SELECT id FROM organization_members 
          WHERE user_id = $1 AND organization_id = $2
        `,
          [req.user.id, invite.club_id],
        );

        if (memberCheck.rows.length === 0) {
          await client.query(
            `
                INSERT INTO organization_members (user_id, organization_id, role, status, joined_at)
                VALUES ($1, $2, $3, 'active', NOW())
            `,
            [req.user.id, invite.club_id, invite.club_role || "member"],
          );
          console.log("✅ Added to organization_members");
        }

        // 2. Create player record (Legacy/Specific functionality)
        let newPlayer = null;
        if (invite.club_role === "player" || !invite.club_role) {
          const playerResult = await client.query(
            `
              INSERT INTO players (
                first_name, last_name, email, user_id, club_id, 
                position, monthly_fee, payment_status, date_of_birth, created_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, NOW())
              RETURNING *
            `,
            [
              invite.first_name || req.user.first_name || "",
              invite.last_name || req.user.last_name || "",
              req.user.email,
              req.user.id,
              invite.club_id,
              invite.club_role === "player" ? null : invite.club_role, // Position
              50, // Default fee
              invite.date_of_birth || "1990-01-01",
            ],
          );
          newPlayer = playerResult.rows[0];
          console.log("✅ Player profile created:", newPlayer.id);

          // Assign to team if specified
          if (invite.team_id) {
            await client.query(
              `
                    INSERT INTO team_players (team_id, player_id, joined_at)
                    VALUES ($1, $2, NOW())
                `,
              [invite.team_id, newPlayer.id],
            );
            console.log(`✅ Assigned to team: ${invite.team_name}`);
          }

          // Create welcome payment
          if (newPlayer.monthly_fee > 0) {
            await client.query(
              `
                    INSERT INTO payments (
                    player_id, club_id, amount, payment_type, description, due_date, payment_status
                    )
                    VALUES ($1, $2, $3, 'monthly_fee', $4, $5, 'pending')
                `,
              [
                newPlayer.id,
                invite.club_id,
                newPlayer.monthly_fee,
                `Welcome payment for ${invite.club_name}`,
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              ],
            );
          }
        }

        // 3. Update User's Current Context to this new club
        await client.query(
          `
            INSERT INTO user_preferences (user_id, current_organization_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET current_organization_id = $2
        `,
          [req.user.id, invite.club_id],
        );

        // 4. Update Invite Status
        if (!invite.is_public) {
          await client.query(
            `
            UPDATE invitations SET 
              status = 'accepted',
              accepted_at = NOW(),
              accepted_by = $1
            WHERE id = $2
          `,
            [req.user.id, invite.id],
          );
          console.log("✅ Invite marked as accepted");
        } else {
          console.log("🔗 Keeping shareable invite active for reuse");
        }

        return {
          player: newPlayer,
          teamAssigned: !!invite.team_id,
          teamName: invite.team_name,
        };
      } catch (transactionError) {
        console.error("❌ Transaction error:", transactionError);
        throw transactionError;
      }
    });

    console.log(
      `🎉 Club invite accepted successfully: ${req.user.email} joined ${invite.club_name}`,
    );

    res.json({
      message: "Successfully joined the club!",
      club: {
        name: invite.club_name,
        id: invite.club_id,
      },
      player: {
        id: result.player.id,
        name: `${result.player.first_name} ${result.player.last_name}`,
        monthlyFee: result.player.monthly_fee,
      },
      team: result.teamAssigned
        ? {
            assigned: true,
            name: result.teamName,
          }
        : null,
      success: true,
    });
  } catch (error) {
    console.error("❌ Accept invite error:", error);
    console.error("❌ Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });

    res.status(500).json({
      error: "Failed to accept invite",
      message: "An error occurred while accepting the invite",
      debug: {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// 🔥 DECLINE CLUB INVITE
router.post("/decline/:token", optionalAuth, async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    if (!token) {
      return res.status(400).json({
        error: "Invite token is required",
      });
    }

    // Get invite details
    const inviteResult = await query(
      `
      SELECT *, status as invite_status, organization_id as club_id FROM invitations WHERE token = $1
    `,
      [token],
    );

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({
        error: "Invite not found",
      });
    }

    const invite = inviteResult.rows[0];

    // Check if invite is still pending
    if (invite.invite_status !== "pending") {
      return res.status(410).json({
        error: "Invite no longer valid",
        message: `This invite has been ${invite.invite_status}`,
      });
    }

    // Don't decline shareable invites - they should remain active
    if (invite.is_public) {
      return res.status(400).json({
        error: "Cannot decline shareable invite",
        message: "Shareable invites cannot be declined",
      });
    }

    // Update invite status
    await query(
      `
      UPDATE invitations SET 
        status = 'declined',
        declined_at = NOW(),
        decline_reason = $1
      WHERE id = $2
    `,
      [reason || null, invite.id],
    );

    console.log(
      `❌ Club invite declined: ${invite.email} declined to join club ${invite.club_id}`,
    );

    res.json({
      message: "Invite declined successfully",
    });
  } catch (error) {
    console.error("Decline invite error:", error);
    res.status(500).json({
      error: "Failed to decline invite",
    });
  }
});

// 🔥 GET CLUB'S SENT INVITES
router.get(
  "/sent",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const { status } = req.query;

      // Get user's club
      const clubResult = await query(
        "SELECT id FROM clubs WHERE owner_id = $1",
        [req.user.id],
      );
      if (clubResult.rows.length === 0) {
        return res.status(404).json({
          error: "No club found",
        });
      }

      const clubId = clubResult.rows[0].id;

      let queryText = `
      SELECT ci.*, u.first_name as inviter_first_name, u.last_name as inviter_last_name,
             ci.status as invite_status, ci.token as invite_token, ci.message as personal_message
      FROM invitations ci
      JOIN users u ON ci.invited_by = u.id
      WHERE ci.organization_id = $1
    `;
      const queryParams = [clubId];

      if (status) {
        queryText += ` AND ci.status = $2`;
        queryParams.push(status);
      }

      queryText += ` ORDER BY ci.created_at DESC`;

      const result = await query(queryText, queryParams);

      res.json({
        invites: result.rows.map((invite) => ({
          id: invite.id,
          email: invite.is_public ? "Shareable Link" : invite.email,
          firstName: invite.first_name,
          lastName: invite.last_name,
          clubRole: invite.club_role,
          inviteStatus: invite.invite_status,
          createdAt: invite.created_at,
          expiresAt: invite.expires_at,
          acceptedAt: invite.accepted_at,
          declinedAt: invite.declined_at,
          personalMessage: invite.personal_message,
          inviter: `${invite.inviter_first_name} ${invite.inviter_last_name}`,
          isPublic: invite.is_public,
          inviteToken: invite.invite_token,
        })),
      });
    } catch (error) {
      console.error("Get sent invites error:", error);
      res.status(500).json({
        error: "Failed to fetch sent invites",
      });
    }
  },
);

module.exports = router;
