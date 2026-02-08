const express = require("express");
const { query } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const emailService = require("../services/email-service");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Middleware to check if user is platform admin
const requirePlatformAdmin = async (req, res, next) => {
  try {
    const result = await query(
      "SELECT is_platform_admin FROM users WHERE id = $1",
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!result.rows[0].is_platform_admin) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Platform admin access required",
      });
    }

    next();
  } catch (error) {
    console.error("Platform admin check error:", error);
    res.status(500).json({ error: "Failed to verify admin status" });
  }
};

// GET /api/platform-admin/stats - Platform-wide statistics
router.get(
  "/stats",
  authenticateToken,
  requirePlatformAdmin,
  async (req, res) => {
    try {
      // Get total counts
      const stats = await query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM organizations) as total_organizations,
                (SELECT COUNT(*) FROM organization_members) as total_memberships,
                (SELECT COUNT(*) FROM invitations WHERE status = 'pending') as pending_invitations,
                (SELECT COUNT(*) FROM plans WHERE active = true) as active_plans
        `);

      // Get recent signups (last 30 days)
      const recentSignups = await query(`
            SELECT COUNT(*) as count
            FROM users
            WHERE created_at >= NOW() - INTERVAL '30 days'
        `);

      // Get organizations by sport
      const orgsBySport = await query(`
            SELECT sport, COUNT(*) as count
            FROM organizations
            GROUP BY sport
            ORDER BY count DESC
        `);

      // Get user growth (last 7 days)
      const userGrowth = await query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM users
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

      res.json({
        stats: stats.rows[0],
        recentSignups: recentSignups.rows[0].count,
        orgsBySport: orgsBySport.rows,
        userGrowth: userGrowth.rows,
      });
    } catch (error) {
      console.error("Get platform stats error:", error);
      res.status(500).json({ error: "Failed to fetch platform statistics" });
    }
  },
);

// GET /api/platform-admin/organizations - All organizations
router.get(
  "/organizations",
  authenticateToken,
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search = "" } = req.query;
      const offset = (page - 1) * limit;

      let queryText = `
            SELECT 
                o.*,
                u.email as owner_email,
                u.first_name as owner_first_name,
                u.last_name as owner_last_name,
                (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) as member_count
            FROM organizations o
            LEFT JOIN users u ON o.owner_id = u.id
        `;

      const params = [];

      if (search) {
        queryText += ` WHERE o.name ILIKE $1 OR o.slug ILIKE $1`;
        params.push(`%${search}%`);
      }

      queryText += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const organizations = await query(queryText, params);

      // Get total count
      let countQuery = "SELECT COUNT(*) FROM organizations";
      if (search) {
        countQuery += ` WHERE name ILIKE $1 OR slug ILIKE $1`;
      }
      const totalCount = await query(countQuery, search ? [`%${search}%`] : []);

      res.json({
        organizations: organizations.rows,
        total: parseInt(totalCount.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (error) {
      console.error("Get all organizations error:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  },
);

// GET /api/platform-admin/users - All users
router.get(
  "/users",
  authenticateToken,
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search = "", accountType = "" } = req.query;
      const offset = (page - 1) * limit;

      let queryText = `
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.account_type,
                u.created_at,
                u.is_active,
                u.is_platform_admin,
                (SELECT COUNT(*) FROM organization_members WHERE user_id = u.id) as org_count
            FROM users u
            WHERE 1=1
        `;

      const params = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        queryText += ` AND (u.email ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (accountType) {
        paramCount++;
        queryText += ` AND u.account_type = $${paramCount}`;
        params.push(accountType);
      }

      queryText += ` ORDER BY u.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const users = await query(queryText, params);

      // Get total count
      let countQuery = "SELECT COUNT(*) FROM users WHERE 1=1";
      const countParams = [];
      let countParamCount = 0;

      if (search) {
        countParamCount++;
        countQuery += ` AND (email ILIKE $${countParamCount} OR first_name ILIKE $${countParamCount} OR last_name ILIKE $${countParamCount})`;
        countParams.push(`%${search}%`);
      }

      if (accountType) {
        countParamCount++;
        countQuery += ` AND account_type = $${countParamCount}`;
        countParams.push(accountType);
      }

      const totalCount = await query(countQuery, countParams);

      res.json({
        users: users.rows,
        total: parseInt(totalCount.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },
);

// GET /api/platform-admin/organization/:id - Single organization details
router.get(
  "/organization/:id",
  authenticateToken,
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get organization details
      const org = await query(
        `
            SELECT 
                o.*,
                u.email as owner_email,
                u.first_name as owner_first_name,
                u.last_name as owner_last_name
            FROM organizations o
            LEFT JOIN users u ON o.owner_id = u.id
            WHERE o.id = $1
        `,
        [id],
      );

      if (org.rows.length === 0) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Get members
      const members = await query(
        `
            SELECT 
                om.*,
                u.email,
                u.first_name,
                u.last_name
            FROM organization_members om
            JOIN users u ON om.user_id = u.id
            WHERE om.organization_id = $1
            ORDER BY 
                CASE om.role
                    WHEN 'owner' THEN 1
                    WHEN 'admin' THEN 2
                    WHEN 'coach' THEN 3
                    WHEN 'player' THEN 4
                    ELSE 5
                END
        `,
        [id],
      );

      // Get payment plans
      const plans = await query(
        `
            SELECT * FROM plans
            WHERE organization_id = $1
            ORDER BY created_at DESC
        `,
        [id],
      );

      res.json({
        organization: org.rows[0],
        members: members.rows,
        plans: plans.rows,
      });
    } catch (error) {
      console.error("Get organization details error:", error);
      res.status(500).json({ error: "Failed to fetch organization details" });
    }
  },
);

// POST /api/platform-admin/organizations/:id/status - Deactivate/Activate organization
router.post(
  "/organizations/:id/status",
  authenticateToken,
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res
          .status(400)
          .json({ error: "isActive boolean value is required" });
      }

      await query(
        `
            UPDATE organizations 
            SET is_active = $1, updated_at = NOW()
            WHERE id = $2
        `,
        [isActive, id],
      );

      res.json({
        success: true,
        message: `Organization ${isActive ? "activated" : "deactivated"} successfully`,
      });
    } catch (error) {
      console.error("Update organization status error:", error);
      res.status(500).json({ error: "Failed to update organization status" });
    }
  },
);

// DELETE /api/platform-admin/organizations/:id - Delete organization
router.delete(
  "/organizations/:id",
  authenticateToken,
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if org exists
      const orgCheck = await query(
        "SELECT id FROM organizations WHERE id = $1",
        [id],
      );
      if (orgCheck.rows.length === 0) {
        return res.status(404).json({ error: "Organization not found" });
      }

      await query("DELETE FROM organizations WHERE id = $1", [id]);

      res.json({
        success: true,
        message: "Organization deleted successfully",
      });
    } catch (error) {
      console.error("Delete organization error:", error);
      res.status(500).json({ error: "Failed to delete organization" });
    }
  },
);

// POST /api/platform-admin/set-admin/:userId - Make user platform admin
router.post(
  "/set-admin/:userId",
  authenticateToken,
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { isPlatformAdmin } = req.body;

      await query(
        `
            UPDATE users 
            SET is_platform_admin = $1, updated_at = NOW()
            WHERE id = $2
        `,
        [isPlatformAdmin, userId],
      );

      res.json({
        success: true,
        message: `User ${isPlatformAdmin ? "granted" : "revoked"} platform admin access`,
      });
    } catch (error) {
      console.error("Set platform admin error:", error);
      res.status(500).json({ error: "Failed to update admin status" });
    }
  },
);

// GET /api/platform-admin/activity - Recent platform activity
router.get(
  "/activity",
  authenticateToken,
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const { limit = 50 } = req.query;

      // Get recent organizations
      const recentOrgs = await query(
        `
            SELECT 
                'organization_created' as type,
                o.name as title,
                o.created_at as timestamp,
                u.email as user_email
            FROM organizations o
            LEFT JOIN users u ON o.owner_id = u.id
            ORDER BY o.created_at DESC
            LIMIT $1
        `,
        [limit],
      );

      // Get recent users
      const recentUsers = await query(
        `
            SELECT 
                'user_registered' as type,
                CONCAT(first_name, ' ', last_name) as title,
                created_at as timestamp,
                email as user_email
            FROM users
            ORDER BY created_at DESC
            LIMIT $1
        `,
        [limit],
      );

      // Get recent invitations
      const recentInvites = await query(
        `
            SELECT 
                'invitation_sent' as type,
                CONCAT('Invited to ', o.name) as title,
                i.created_at as timestamp,
                i.email as user_email
            FROM invitations i
            LEFT JOIN organizations o ON i.organization_id = o.id
            ORDER BY i.created_at DESC
            LIMIT $1
        `,
        [limit],
      );

      // Combine and sort
      const allActivity = [
        ...recentOrgs.rows,
        ...recentUsers.rows,
        ...recentInvites.rows,
      ]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      res.json({
        activity: allActivity,
      });
    } catch (error) {
      console.error("Get platform activity error:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  },
);

// POST /api/platform-admin/users - Create new user
router.post(
  "/users",
  authenticateToken,
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const { email, firstName, lastName, accountType } = req.body;

      // Basic validation
      if (!email || !firstName || !lastName || !accountType) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Check if user exists
      const existingUser = await query(
        "SELECT id FROM users WHERE email = $1",
        [email],
      );
      if (existingUser.rows.length > 0) {
        return res
          .status(409)
          .json({ error: "User with this email already exists" });
      }

      // Generate random temporary password
      const tempPassword = crypto.randomBytes(8).toString("hex");
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Generate reset token for "Set Password" link
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 24 * 3600000); // 24 hours

      // Create User
      const newUser = await query(
        `
            INSERT INTO users (
                email, password_hash, first_name, last_name, account_type, 
                reset_token, reset_expires, created_at, updated_at, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), true)
            RETURNING id, email, first_name, last_name, account_type
        `,
        [
          email,
          hashedPassword,
          firstName,
          lastName,
          accountType,
          resetToken,
          resetExpires,
        ],
      );

      // Send Welcome Email
      const setPasswordLink = `${
        process.env.FRONTEND_URL || "http://localhost:8080"
      }/forgot-password.html?token=${resetToken}`; // Reusing forgot password flow for setting password

      try {
        await emailService.sendAdminWelcomeEmail({
          email,
          firstName,
          accountType,
          setPasswordLink,
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the request, just log it
      }

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: newUser.rows[0],
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  },
);

// POST /api/platform-admin/users/:userId/status - Deactivate/Activate user
router.post(
  "/users/:userId/status",
  authenticateToken,
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res
          .status(400)
          .json({ error: "isActive boolean value is required" });
      }

      // Don't allow deactivating self
      if (userId === req.user.id) {
        return res.status(400).json({ error: "Cannot deactivate yourself" });
      }

      await query(
        `
            UPDATE users 
            SET is_active = $1, updated_at = NOW()
            WHERE id = $2
        `,
        [isActive, userId],
      );

      res.json({
        success: true,
        message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      });
    } catch (error) {
      console.error("Update user status error:", error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  },
);

// DELETE /api/platform-admin/users/:userId - Delete user
router.delete(
  "/users/:userId",
  authenticateToken,
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Don't allow deleting self
      if (userId === req.user.id) {
        return res.status(400).json({ error: "Cannot delete yourself" });
      }

      // Check if user exists
      const userCheck = await query("SELECT id FROM users WHERE id = $1", [
        userId,
      ]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // HARD DELETE with manual cascading cleanup
      console.log(`🗑️ Deleting user and related data...`);

      // 1. User preferences
      await query("DELETE FROM user_preferences WHERE user_id = $1", [userId]);

      // 2. Organization memberships
      await query("DELETE FROM organization_members WHERE user_id = $1", [
        userId,
      ]);

      // 3. Player plans
      await query("DELETE FROM player_plans WHERE user_id = $1", [userId]);

      // 4. Invitations
      await query("DELETE FROM invitations WHERE invited_by = $1", [userId]);

      // 5. Players and their data
      const players = await query("SELECT id FROM players WHERE user_id = $1", [
        userId,
      ]);
      if (players.rows.length > 0) {
        const playerIds = players.rows.map((p) => p.id);
        await query("DELETE FROM player_stats WHERE player_id = ANY($1)", [
          playerIds,
        ]);
        await query("DELETE FROM payments WHERE player_id = ANY($1)", [
          playerIds,
        ]);
        await query("DELETE FROM team_players WHERE player_id = ANY($1)", [
          playerIds,
        ]);
        await query("DELETE FROM players WHERE user_id = $1", [userId]);
      }

      // 6. Staff
      await query("DELETE FROM staff WHERE user_id = $1", [userId]);

      // 7. User profile
      await query("DELETE FROM user_profiles WHERE user_id = $1", [userId]);

      // 8. Owned organizations
      const ownedOrgs = await query(
        "SELECT id FROM organizations WHERE owner_id = $1",
        [userId],
      );
      if (ownedOrgs.rows.length > 0) {
        const orgIds = ownedOrgs.rows.map((o) => o.id);
        await query("DELETE FROM events WHERE club_id = ANY($1)", [orgIds]);
        await query("DELETE FROM teams WHERE club_id = ANY($1)", [orgIds]);
        await query("DELETE FROM plans WHERE club_id = ANY($1)", [orgIds]);
        await query(
          "DELETE FROM subscriptions WHERE organization_id = ANY($1)",
          [orgIds],
        );
        await query(
          "DELETE FROM organization_members WHERE organization_id = ANY($1)",
          [orgIds],
        );
        await query("DELETE FROM organizations WHERE id = ANY($1)", [orgIds]);
        await query("DELETE FROM clubs WHERE id = ANY($1)", [orgIds]);
      }

      // 9. Finally, delete the user
      await query("DELETE FROM users WHERE id = $1", [userId]);

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  },
);

// POST /api/platform-admin/generate-mock-data - Generate mock data for demo
router.post(
  "/generate-mock-data",
  authenticateToken,
  requirePlatformAdmin,
  async (req, res) => {
    try {
      console.log("🛠️ Generating mock data requested by", req.user.email);
      const { seedDemoUsers } = require("../scripts/seed-demo-users");

      // Run the seeder
      await seedDemoUsers();

      res.json({
        success: true,
        message: "Mock data generated successfully",
      });
    } catch (error) {
      console.error("Generate mock data error:", error);
      res.status(500).json({ error: "Failed to generate mock data" });
    }
  },
);

// POST /api/platform-admin/onboard-club - Full onboard: Create User + Org + Link
router.post(
  "/onboard-club",
  authenticateToken,
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const {
        email,
        firstName,
        lastName, // User details
        clubName,
        sport,
        location, // Club details
      } = req.body;

      // Basic validation
      if (!email || !firstName || !lastName || !clubName) {
        return res
          .status(400)
          .json({ error: "Email, Name, and Club Name are required" });
      }

      // 1. Create User (or get if exists)
      // Check if user exists
      let userId;
      let stripeAccountId = null;
      const existingUser = await query(
        "SELECT id FROM users WHERE email = $1",
        [email],
      );

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        console.log(`Onboarding: Found existing user ${userId} for ${email}`);

        // OPTIONAL: Check if they ALREADY have an organization with a Stripe account
        const existingOrgStripe = await query(
          "SELECT stripe_account_id FROM organizations WHERE owner_id = $1 AND stripe_account_id IS NOT NULL LIMIT 1",
          [userId],
        );
        if (existingOrgStripe.rows.length > 0) {
          stripeAccountId = existingOrgStripe.rows[0].stripe_account_id;
          console.log(
            `Onboarding: Found existing Stripe Account through user's other organization: ${stripeAccountId}`,
          );
        }
      }

      // Check if this email already exists in Stripe Connected Accounts (Platform-wide)
      // Only if we haven't found it via existing organsations
      if (!stripeAccountId) {
        try {
          console.log(
            `Onboarding: Searching Stripe for account with email ${email}...`,
          );
          // Stripe accounts can be found by email using list
          const search = await stripe.accounts.list({
            email: email,
            limit: 1,
          });

          if (search.data && search.data.length > 0) {
            stripeAccountId = search.data[0].id;
            console.log(
              `Onboarding: Found MATCHING Stripe Account on Platform: ${stripeAccountId}`,
            );
          }
        } catch (stripeErr) {
          console.warn(
            "Onboarding: Failed to search Stripe for existing account:",
            stripeErr.message,
          );
          // Continue without linking - they can connect manually later
        }
      }

      if (existingUser.rows.length === 0) {
        // Create New User
        console.log("📝 Creating new user for:", email);

        const tempPassword = crypto.randomBytes(8).toString("hex");
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetExpires = new Date(Date.now() + 24 * 3600000); // 24 hours

        const newUser = await query(
          `
                    INSERT INTO users (
                        email, password_hash, first_name, last_name, account_type, 
                        reset_token, reset_expires, created_at, updated_at, is_active
                    )
                    VALUES ($1, $2, $3, $4, 'organization', $5, $6, NOW(), NOW(), true)
                    RETURNING id
                `,
          [
            email,
            hashedPassword,
            firstName,
            lastName,
            resetToken,
            resetExpires,
          ],
        );
        userId = newUser.rows[0].id;
        console.log("✅ User created with ID:", userId);

        // Send Welcome Email
        const setPasswordLink = `${
          process.env.FRONTEND_URL || "http://localhost:8080"
        }/forgot-password.html?token=${resetToken}`;

        try {
          console.log("📧 Sending welcome email to:", email);
          // Using the existing email service function
          await emailService.sendAdminWelcomeEmail({
            email,
            firstName,
            accountType: "organization",
            setPasswordLink,
            clubName: clubName, // Pass club name for context
          });
          console.log("✅ Welcome email sent successfully");
        } catch (emailError) {
          console.error("❌ Failed to send welcome email:", emailError);
        }
      } else {
        console.log("✅ Using existing user:", existingUser.rows[0].id);
      }

      // 2. Create Organization
      // Generate slug
      console.log("🏢 Creating organization:", clubName);
      const slug =
        clubName
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .substring(0, 255) +
        "-" +
        Date.now(); // Ensure uniqueness

      const newOrg = await query(
        `
                INSERT INTO organizations (
                    name, slug, sport, location, owner_id, is_active, stripe_account_id, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())
                RETURNING id, name
            `,
        [clubName, slug, sport, location, userId, stripeAccountId || null],
      );

      const orgId = newOrg.rows[0].id;
      console.log("✅ Organization created with ID:", orgId);

      // 3. Link User to Organization (as Owner)
      console.log("🔗 Linking user to organization...");
      await query(
        `
                INSERT INTO organization_members (
                    organization_id, user_id, role, status, joined_at
                ) VALUES ($1, $2, 'owner', 'active', NOW())
                ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner', status = 'active'
            `,
        [orgId, userId],
      );

      // 4. Set User Preference
      await query(
        `
                INSERT INTO user_preferences (user_id, current_organization_id)
                VALUES ($1, $2)
                ON CONFLICT (user_id) DO UPDATE SET current_organization_id = $2
            `,
        [userId, orgId],
      );
      console.log("✅ Onboarding completed successfully");

      res.status(201).json({
        success: true,
        message: "Club onboarded successfully",
        organization: newOrg.rows[0],
        user_id: userId,
      });
    } catch (error) {
      console.error("❌ Onboard club error:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack,
      });
      res.status(500).json({
        error: "Failed to onboard club",
        details: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },
);

module.exports = router;
