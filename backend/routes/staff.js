const express = require("express");
const { query, queries, withTransaction } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
} = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

const router = express.Router();

// Validation rules
const staffValidation = [
  body("firstName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("First name is required"),
  body("lastName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Last name is required"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("phone").optional().trim(),
  body("role")
    .isIn([
      "coach",
      "assistant-coach",
      "treasurer",
      "coaching-supervisor",
      "referee",
      "administrator",
    ])
    .withMessage("Invalid role"),
  body("permissions")
    .optional()
    .isArray()
    .withMessage("Permissions must be an array"),
  body("clubId").isUUID().withMessage("Valid club ID is required"),
];

// Get all staff (with optional club filter)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { clubId, role } = req.query;

    let queryText = "SELECT * FROM staff WHERE 1=1";
    const queryParams = [];
    let paramCount = 0;

    // Filter by club if provided
    if (clubId) {
      paramCount++;
      queryText += ` AND club_id = $${paramCount}`;
      queryParams.push(clubId);
    } else {
      // Enforce Isolation: If no clubId, limit to user's clubs
      paramCount++;
      queryText += ` AND club_id IN (
           SELECT id FROM organizations WHERE owner_id = $${paramCount}
           UNION
           SELECT club_id FROM staff WHERE user_id = $${paramCount}
       )`;
      queryParams.push(req.user.id);
    }

    // Filter by role if provided
    if (role) {
      paramCount++;
      queryText += ` AND role = $${paramCount}`;
      queryParams.push(role);
    }

    queryText += " ORDER BY created_at DESC";

    const result = await query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error("Get staff error:", error);
    res.status(500).json({
      error: "Failed to fetch staff",
      message: "An error occurred while fetching staff members",
    });
  }
});

// Get specific staff member
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await query(queries.findStaffById, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Staff member not found",
        message: "Staff member with this ID does not exist",
      });
    }

    const staff = result.rows[0];

    // Get teams they coach (if they're a coach)
    if (["coach", "assistant-coach"].includes(staff.role)) {
      const teamsResult = await query(
        `
        SELECT t.*, 
               COUNT(tp.player_id) as player_count
        FROM teams t
        LEFT JOIN team_players tp ON t.id = tp.team_id
        WHERE t.coach_id = $1
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `,
        [req.params.id],
      );

      staff.teams = teamsResult.rows;
    }

    // Get club information
    const clubResult = await query(queries.findClubById, [staff.club_id]);
    dashboardData.club = clubResult.rows[0];

    // Get recent activities based on permissions
    if (staff.permissions.includes("players")) {
      const recentPlayersResult = await query(
        `
        SELECT * FROM players 
        WHERE club_id = $1 
        ORDER BY created_at DESC 
        LIMIT 5
      `,
        [staff.club_id],
      );
      dashboardData.recentPlayers = recentPlayersResult.rows;
    }

    if (staff.permissions.includes("events")) {
      const recentEventsResult = await query(
        `
        SELECT * FROM events 
        WHERE club_id = $1 
        ORDER BY created_at DESC 
        LIMIT 5
      `,
        [staff.club_id],
      );
      dashboardData.recentEvents = recentEventsResult.rows;
    }

    if (staff.permissions.includes("finances")) {
      const recentPaymentsResult = await query(
        `
        SELECT p.*, pl.first_name, pl.last_name
        FROM payments p
        JOIN players pl ON p.player_id = pl.id
        WHERE p.club_id = $1
        ORDER BY p.created_at DESC
        LIMIT 5
      `,
        [staff.club_id],
      );
      dashboardData.recentPayments = recentPaymentsResult.rows;

      // Get payment statistics
      const paymentStatsResult = await query(
        `
        SELECT 
          COUNT(*) as total_payments,
          SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN payment_status = 'overdue' THEN 1 ELSE 0 END) as overdue_count,
          SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END) as total_revenue
        FROM payments
        WHERE club_id = $1
      `,
        [staff.club_id],
      );
      dashboardData.paymentStats = paymentStatsResult.rows[0];
    }

    res.json({
      staff,
      dashboard: dashboardData,
    });
  } catch (error) {
    console.error("Get staff dashboard error:", error);
    res.status(500).json({
      error: "Failed to fetch dashboard data",
    });
  }
});

// Get staff performance report (for coaching staff)
router.get("/:id/performance", authenticateToken, async (req, res) => {
  try {
    const staffResult = await query(queries.findStaffById, [req.params.id]);
    if (staffResult.rows.length === 0) {
      return res.status(404).json({
        error: "Staff member not found",
      });
    }

    const staff = staffResult.rows[0];

    // Check if user has permission to view this report
    const hasPermission =
      req.user.id === staff.user_id || req.user.accountType === "organization";

    if (!hasPermission) {
      return res.status(403).json({
        error: "Access denied",
      });
    }

    // Only generate performance reports for coaching staff
    if (
      !["coach", "assistant-coach", "coaching-supervisor"].includes(staff.role)
    ) {
      return res.status(400).json({
        error: "Performance reports only available for coaching staff",
      });
    }

    // Get teams coached and their performance
    const teamPerformanceResult = await query(
      `
      SELECT 
        t.id,
        t.name,
        t.wins,
        t.losses,
        t.draws,
        COUNT(p.id) as player_count,
        AVG(pr.rating) as avg_player_rating
      FROM teams t
      LEFT JOIN team_players tp ON t.id = tp.team_id
      LEFT JOIN players p ON tp.player_id = p.id
      LEFT JOIN player_ratings pr ON p.id = pr.player_id
      WHERE t.coach_id = $1
      GROUP BY t.id, t.name, t.wins, t.losses, t.draws
    `,
      [req.params.id],
    );

    // Get recent match results
    const matchResultsResult = await query(
      `
      SELECT 
        e.title,
        e.event_date,
        e.opponent,
        mr.home_score,
        mr.away_score,
        mr.result,
        t.name as team_name
      FROM events e
      JOIN match_results mr ON e.id = mr.event_id
      JOIN teams t ON e.team_id = t.id
      WHERE t.coach_id = $1 AND e.event_type = 'match'
      ORDER BY e.event_date DESC
      LIMIT 10
    `,
      [req.params.id],
    );

    // Calculate overall statistics
    const overallStats = teamPerformanceResult.rows.reduce(
      (acc, team) => {
        acc.total_games += team.wins + team.losses + team.draws;
        acc.total_wins += team.wins;
        acc.total_losses += team.losses;
        acc.total_draws += team.draws;
        acc.total_players += parseInt(team.player_count);
        return acc;
      },
      {
        total_games: 0,
        total_wins: 0,
        total_losses: 0,
        total_draws: 0,
        total_players: 0,
      },
    );

    overallStats.win_percentage =
      overallStats.total_games > 0
        ? Math.round((overallStats.total_wins / overallStats.total_games) * 100)
        : 0;

    res.json({
      staff: {
        id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        role: staff.role,
        join_date: staff.join_date,
      },
      team_performance: teamPerformanceResult.rows,
      recent_matches: matchResultsResult.rows,
      overall_statistics: overallStats,
    });
  } catch (error) {
    console.error("Get staff performance error:", error);
    res.status(500).json({
      error: "Failed to fetch performance report",
    });
  }
});

// Update staff role
router.patch(
  "/:id/role",
  authenticateToken,
  requireOrganization,
  [
    body("role")
      .isIn([
        "coach",
        "assistant-coach",
        "treasurer",
        "coaching-supervisor",
        "referee",
        "administrator",
      ])
      .withMessage("Invalid role"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { role } = req.body;

      // Verify staff member exists and user has permission
      const staffResult = await query(queries.findStaffById, [req.params.id]);
      if (staffResult.rows.length === 0) {
        return res.status(404).json({
          error: "Staff member not found",
        });
      }

      const staff = staffResult.rows[0];
      const clubResult = await query(queries.findClubById, [staff.club_id]);
      const club = clubResult.rows[0];

      if (club.owner_id !== req.user.id) {
        return res.status(403).json({
          error: "Access denied",
        });
      }

      // Update role and adjust permissions accordingly
      const defaultPermissions = getDefaultPermissions(role);

      const result = await query(
        `
      UPDATE staff SET 
        role = $1, 
        permissions = $2,
        updated_at = NOW() 
      WHERE id = $3
      RETURNING *
    `,
        [role, defaultPermissions, req.params.id],
      );

      res.json({
        message: "Staff role updated successfully",
        staff: result.rows[0],
      });
    } catch (error) {
      console.error("Update staff role error:", error);
      res.status(500).json({
        error: "Failed to update staff role",
      });
    }
  },
);

// Get staff schedule (events and duties)
router.get("/:id/schedule", authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const staffResult = await query(queries.findStaffById, [req.params.id]);
    if (staffResult.rows.length === 0) {
      return res.status(404).json({
        error: "Staff member not found",
      });
    }

    const staff = staffResult.rows[0];

    // Check if user has permission to view this schedule
    const hasPermission =
      req.user.id === staff.user_id || req.user.accountType === "organization";

    if (!hasPermission) {
      return res.status(403).json({
        error: "Access denied",
      });
    }

    let queryText = `
      SELECT e.*, t.name as team_name
      FROM events e
      LEFT JOIN teams t ON e.team_id = t.id
      WHERE (t.coach_id = $1 OR e.club_id = $2)
    `;
    const queryParams = [req.params.id, staff.club_id];
    let paramCount = 2;

    // Filter by date range if provided
    if (startDate) {
      paramCount++;
      queryText += ` AND e.event_date >= ${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      queryText += ` AND e.event_date <= ${paramCount}`;
      queryParams.push(endDate);
    }

    queryText += ` ORDER BY e.event_date ASC, e.event_time ASC`;

    const eventsResult = await query(queryText, queryParams);

    // Group events by date for easier calendar display
    const eventsByDate = eventsResult.rows.reduce((acc, event) => {
      const date = event.event_date.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(event);
      return acc;
    }, {});

    res.json({
      staff: {
        id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        role: staff.role,
      },
      events: eventsResult.rows,
      events_by_date: eventsByDate,
    });
  } catch (error) {
    console.error("Get staff schedule error:", error);
    res.status(500).json({
      error: "Failed to fetch schedule",
    });
  }
});

// Helper function to get default permissions based on role
function getDefaultPermissions(role) {
  const permissionSets = {
    coach: ["players", "events"],
    "assistant-coach": ["players", "events"],
    treasurer: ["finances", "players"],
    "coaching-supervisor": ["players", "events", "reports"],
    referee: ["events"],
    administrator: ["players", "events", "listings", "reports", "settings"],
  };

  return permissionSets[role] || [];
}

// Create new staff member
router.post(
  "/",
  authenticateToken,
  requireOrganization,
  staffValidation,
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
        firstName,
        lastName,
        email,
        phone,
        role,
        permissions,
        clubId,
        userId,
      } = req.body;

      // Verify club exists and user owns it
      const clubResult = await query(queries.findClubById, [clubId]);
      if (clubResult.rows.length === 0) {
        return res.status(404).json({
          error: "Club not found",
          message: "The specified club does not exist",
        });
      }

      const club = clubResult.rows[0];
      if (club.owner_id !== req.user.id) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only add staff to your own clubs",
        });
      }

      // Check if staff member already exists in this club
      const existingStaff = await query(
        "SELECT id FROM staff WHERE email = $1 AND club_id = $2",
        [email, clubId],
      );

      if (existingStaff.rows.length > 0) {
        return res.status(409).json({
          error: "Staff member already exists",
          message: "A staff member with this email already exists in this club",
        });
      }

      // Set default permissions based on role
      const defaultPermissions = getDefaultPermissions(role);
      const finalPermissions = permissions || defaultPermissions;

      const result = await query(queries.createStaff, [
        firstName,
        lastName,
        email,
        phone || null,
        role,
        finalPermissions,
        clubId,
      ]);

      const newStaff = result.rows[0];

      res.status(201).json({
        message: "Staff member added successfully",
        staff: newStaff,
      });
    } catch (error) {
      console.error("Create staff error:", error);
      res.status(500).json({
        error: "Failed to add staff member",
        message: "An error occurred while adding the staff member",
      });
    }
  },
);

// Update staff member
router.put(
  "/:id",
  authenticateToken,
  requireOrganization,
  staffValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      // Check if staff member exists and user has permission
      const staffResult = await query(queries.findStaffById, [req.params.id]);
      if (staffResult.rows.length === 0) {
        return res.status(404).json({
          error: "Staff member not found",
          message: "Staff member with this ID does not exist",
        });
      }

      const staff = staffResult.rows[0];

      // Verify user owns the club
      const clubResult = await query(queries.findClubById, [staff.club_id]);
      const club = clubResult.rows[0];

      if (club.owner_id !== req.user.id) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only update staff in your own clubs",
        });
      }

      const {
        firstName,
        lastName,
        email,
        phone,
        role,
        permissions,
        status,
        teamId,
      } = req.body;

      const result = await query(
        `
      UPDATE staff SET 
        first_name = $1,
        last_name = $2,
        email = $3,
        phone = $4,
        role = $5,
        permissions = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `,
        [
          firstName,
          lastName,
          email,
          phone || null,
          role,
          permissions || staff.permissions,
          req.params.id,
        ],
      );

      const updatedStaff = result.rows[0];

      // Update organization_members status and role
      const roleMapping = {
        coach: "coach",
        "assistant-coach": "assistant_coach",
        administrator: "admin",
        treasurer: "staff",
        "coaching-supervisor": "staff",
        referee: "staff",
        secretary: "staff",
        "welfare-officer": "staff",
        staff: "staff",
      };
      const orgRole = roleMapping[role];

      if (status || orgRole) {
        let updateQuery = "UPDATE organization_members SET updated_at = NOW()";
        const updateParams = [];
        let pIdx = 1;

        if (status) {
          updateQuery += `, status = $${pIdx++}`;
          updateParams.push(status);
        }

        if (orgRole) {
          updateQuery += `, role = $${pIdx++}`;
          updateParams.push(orgRole);
        }

        updateQuery += ` WHERE user_id = $${pIdx++} AND organization_id = $${pIdx++}`;
        updateParams.push(staff.user_id, staff.club_id);

        await query(updateQuery, updateParams);

        if (status) updatedStaff.status = status;
      }

      // Update team assignment if teamId is provided (or explicit null/empty to unassign)
      if (typeof teamId !== "undefined") {
        // 1. Unassign from any previous teams this staff was coaching
        await query(`UPDATE teams SET coach_id = NULL WHERE coach_id = $1`, [
          req.params.id,
        ]);

        // 2. Assign to new team if provided
        if (teamId) {
          // Ensure the team belongs to this club to prevent unauthorized assignment
          const teamCheck = await query(
            `SELECT id FROM teams WHERE id = $1 AND club_id = $2`,
            [teamId, staff.club_id],
          );
          if (teamCheck.rows.length > 0) {
            await query(`UPDATE teams SET coach_id = $1 WHERE id = $2`, [
              req.params.id,
              teamId,
            ]);
            updatedStaff.team_id = teamId;
          }
        }
      }

      res.json({
        message: "Staff member updated successfully",
        staff: updatedStaff,
      });
    } catch (error) {
      console.error("Update staff error:", error);
      res.status(500).json({
        error: "Failed to update staff member",
        message: "An error occurred while updating the staff member",
      });
    }
  },
);

// Delete staff member
router.delete(
  "/:id",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      // Check if staff member exists and user has permission
      const staffResult = await query(queries.findStaffById, [req.params.id]);
      if (staffResult.rows.length === 0) {
        return res.status(404).json({
          error: "Staff member not found",
          message: "Staff member with this ID does not exist",
        });
      }

      const staff = staffResult.rows[0];

      // Verify user owns the club
      const clubResult = await query(queries.findClubById, [staff.club_id]);
      const club = clubResult.rows[0];

      if (club.owner_id !== req.user.id) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only delete staff from your own clubs",
        });
      }

      // Delete staff member and handle related data
      await withTransaction(async (client) => {
        // If they're a coach, reassign or remove their teams
        if (["coach", "assistant-coach"].includes(staff.role)) {
          await client.query(
            "UPDATE teams SET coach_id = NULL WHERE coach_id = $1",
            [req.params.id],
          );
        }

        // Delete staff member
        await client.query("DELETE FROM staff WHERE id = $1", [req.params.id]);
      });

      res.json({
        message: "Staff member deleted successfully",
      });
    } catch (error) {
      console.error("Delete staff error:", error);
      res.status(500).json({
        error: "Failed to delete staff member",
        message: "An error occurred while deleting the staff member",
      });
    }
  },
);

// Get staff by club
router.get("/club/:clubId", authenticateToken, async (req, res) => {
  try {
    const result = await query(queries.findStaffByClub, [req.params.clubId]);

    // Group staff by role for easier frontend handling
    const staffByRole = result.rows.reduce((acc, staff) => {
      if (!acc[staff.role]) {
        acc[staff.role] = [];
      }
      acc[staff.role].push(staff);
      return acc;
    }, {});

    res.json({
      all: result.rows,
      byRole: staffByRole,
    });
  } catch (error) {
    console.error("Get staff by club error:", error);
    res.status(500).json({
      error: "Failed to fetch club staff",
      message: "An error occurred while fetching club staff",
    });
  }
});

// Update staff permissions
router.patch(
  "/:id/permissions",
  authenticateToken,
  requireOrganization,
  [body("permissions").isArray().withMessage("Permissions must be an array")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { permissions } = req.body;

      // Verify staff member exists and user has permission
      const staffResult = await query(queries.findStaffById, [req.params.id]);
      if (staffResult.rows.length === 0) {
        return res.status(404).json({
          error: "Staff member not found",
        });
      }

      const staff = staffResult.rows[0];
      const clubResult = await query(queries.findClubById, [staff.club_id]);
      const club = clubResult.rows[0];

      if (club.owner_id !== req.user.id) {
        return res.status(403).json({
          error: "Access denied",
        });
      }

      // Validate permissions
      const validPermissions = [
        "finances",
        "players",
        "events",
        "listings",
        "reports",
        "settings",
      ];
      const invalidPermissions = permissions.filter(
        (p) => !validPermissions.includes(p),
      );

      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          error: "Invalid permissions",
          message: `Invalid permissions: ${invalidPermissions.join(", ")}`,
        });
      }

      // Update permissions
      await query(
        `
      UPDATE staff SET 
        permissions = $1, 
        updated_at = NOW() 
      WHERE id = $2
    `,
        [permissions, req.params.id],
      );

      res.json({
        message: "Permissions updated successfully",
      });
    } catch (error) {
      console.error("Update permissions error:", error);
      res.status(500).json({
        error: "Failed to update permissions",
      });
    }
  },
);

// Get staff dashboard (for coach/staff members)
router.get("/:id/dashboard", authenticateToken, async (req, res) => {
  try {
    const staffResult = await query(queries.findStaffById, [req.params.id]);
    if (staffResult.rows.length === 0) {
      return res.status(404).json({
        error: "Staff member not found",
      });
    }

    const staff = staffResult.rows[0];

    // Get staff's teams and upcoming events
    const dashboardData = {};

    // If coach, get their teams
    if (["coach", "assistant-coach"].includes(staff.role)) {
      const teamsResult = await query(
        `
        SELECT t.*, COUNT(tp.player_id) as player_count
        FROM teams t
        LEFT JOIN team_players tp ON t.id = tp.team_id
        WHERE t.coach_id = $1
        GROUP BY t.id
      `,
        [req.params.id],
      );

      dashboardData.teams = teamsResult.rows;

      // Get upcoming events for their teams
      const eventsResult = await query(
        `
        SELECT e.* FROM events e
        JOIN teams t ON e.team_id = t.id
        WHERE t.coach_id = $1 AND e.event_date >= CURRENT_DATE
        ORDER BY e.event_date ASC
        LIMIT 10
      `,
        [req.params.id],
      );

      dashboardData.upcomingEvents = eventsResult.rows;
    }

    const clubResult = await query(queries.findClubById, [staff.club_id]);
    dashboardData.club = clubResult.rows[0];

    // Get recent activities based on permissions
    if (staff.permissions.includes("players")) {
      const recentPlayersResult = await query(
        `
        SELECT * FROM players 
        WHERE club_id = $1 
        ORDER BY created_at DESC 
        LIMIT 5
      `,
        [staff.club_id],
      );
      dashboardData.recentPlayers = recentPlayersResult.rows;
    }

    if (staff.permissions.includes("events")) {
      const recentEventsResult = await query(
        `
        SELECT * FROM events 
        WHERE club_id = $1 
        ORDER BY created_at DESC 
        LIMIT 5
      `,
        [staff.club_id],
      );
      dashboardData.recentEvents = recentEventsResult.rows;
    }

    if (staff.permissions.includes("finances")) {
      const recentPaymentsResult = await query(
        `
        SELECT p.*, pl.first_name, pl.last_name
        FROM payments p
        JOIN players pl ON p.player_id = pl.id
        WHERE p.club_id = $1
        ORDER BY p.created_at DESC
        LIMIT 5
      `,
        [staff.club_id],
      );
      dashboardData.recentPayments = recentPaymentsResult.rows;

      // Get payment statistics
      const paymentStatsResult = await query(
        `
        SELECT 
          COUNT(*) as total_payments,
          SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN payment_status = 'overdue' THEN 1 ELSE 0 END) as overdue_count,
          SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END) as total_revenue
        FROM payments
        WHERE club_id = $1
      `,
        [staff.club_id],
      );
      dashboardData.paymentStats = paymentStatsResult.rows[0];
    }

    res.json({
      staff,
      dashboard: dashboardData,
    });
  } catch (error) {
    console.error("Get staff dashboard error:", error);
    res.status(500).json({
      error: "Failed to fetch dashboard data",
    });
  }
});

// Get staff performance report (for coaching staff)
router.get("/:id/performance", authenticateToken, async (req, res) => {
  try {
    const staffResult = await query(queries.findStaffById, [req.params.id]);
    if (staffResult.rows.length === 0) {
      return res.status(404).json({
        error: "Staff member not found",
      });
    }

    const staff = staffResult.rows[0];

    // Check if user has permission to view this report
    const hasPermission =
      req.user.id === staff.user_id || req.user.accountType === "organization";

    if (!hasPermission) {
      return res.status(403).json({
        error: "Access denied",
      });
    }

    // Only generate performance reports for coaching staff
    if (
      !["coach", "assistant-coach", "coaching-supervisor"].includes(staff.role)
    ) {
      return res.status(400).json({
        error: "Performance reports only available for coaching staff",
      });
    }

    // Get teams coached and their performance
    const teamPerformanceResult = await query(
      `
      SELECT 
        t.id,
        t.name,
        t.wins,
        t.losses,
        t.draws,
        COUNT(p.id) as player_count,
        AVG(pr.rating) as avg_player_rating
      FROM teams t
      LEFT JOIN team_players tp ON t.id = tp.team_id
      LEFT JOIN players p ON tp.player_id = p.id
      LEFT JOIN player_ratings pr ON p.id = pr.player_id
      WHERE t.coach_id = $1
      GROUP BY t.id, t.name, t.wins, t.losses, t.draws
    `,
      [req.params.id],
    );

    // Get recent match results
    const matchResultsResult = await query(
      `
      SELECT 
        e.title,
        e.event_date,
        e.opponent,
        mr.home_score,
        mr.away_score,
        mr.result,
        t.name as team_name
      FROM events e
      JOIN match_results mr ON e.id = mr.event_id
      JOIN teams t ON e.team_id = t.id
      WHERE t.coach_id = $1 AND e.event_type = 'match'
      ORDER BY e.event_date DESC
      LIMIT 10
    `,
      [req.params.id],
    );

    // Calculate overall statistics
    const overallStats = teamPerformanceResult.rows.reduce(
      (acc, team) => {
        acc.total_games += team.wins + team.losses + team.draws;
        acc.total_wins += team.wins;
        acc.total_losses += team.losses;
        acc.total_draws += team.draws;
        acc.total_players += parseInt(team.player_count);
        return acc;
      },
      {
        total_games: 0,
        total_wins: 0,
        total_losses: 0,
        total_draws: 0,
        total_players: 0,
      },
    );

    overallStats.win_percentage =
      overallStats.total_games > 0
        ? Math.round((overallStats.total_wins / overallStats.total_games) * 100)
        : 0;

    res.json({
      staff: {
        id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        role: staff.role,
        join_date: staff.join_date,
      },
      team_performance: teamPerformanceResult.rows,
      recent_matches: matchResultsResult.rows,
      overall_statistics: overallStats,
    });
  } catch (error) {
    console.error("Get staff performance error:", error);
    res.status(500).json({
      error: "Failed to fetch performance report",
    });
  }
});

// Update staff role
router.patch(
  "/:id/role",
  authenticateToken,
  requireOrganization,
  [
    body("role")
      .isIn([
        "coach",
        "assistant-coach",
        "treasurer",
        "coaching-supervisor",
        "referee",
        "administrator",
      ])
      .withMessage("Invalid role"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { role } = req.body;

      // Verify staff member exists and user has permission
      const staffResult = await query(queries.findStaffById, [req.params.id]);
      if (staffResult.rows.length === 0) {
        return res.status(404).json({
          error: "Staff member not found",
        });
      }

      const staff = staffResult.rows[0];
      const clubResult = await query(queries.findClubById, [staff.club_id]);
      const club = clubResult.rows[0];

      if (club.owner_id !== req.user.id) {
        return res.status(403).json({
          error: "Access denied",
        });
      }

      // Update role and adjust permissions accordingly
      const defaultPermissions = getDefaultPermissions(role);

      const result = await query(
        `
      UPDATE staff SET 
        role = $1, 
        permissions = $2,
        updated_at = NOW() 
      WHERE id = $3
      RETURNING *
    `,
        [role, defaultPermissions, req.params.id],
      );

      res.json({
        message: "Staff role updated successfully",
        staff: result.rows[0],
      });
    } catch (error) {
      console.error("Update staff role error:", error);
      res.status(500).json({
        error: "Failed to update staff role",
      });
    }
  },
);

// Get staff schedule (events and duties)
router.get("/:id/schedule", authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const staffResult = await query(queries.findStaffById, [req.params.id]);
    if (staffResult.rows.length === 0) {
      return res.status(404).json({
        error: "Staff member not found",
      });
    }

    const staff = staffResult.rows[0];

    // Check if user has permission to view this schedule
    const hasPermission =
      req.user.id === staff.user_id || req.user.accountType === "organization";

    if (!hasPermission) {
      return res.status(403).json({
        error: "Access denied",
      });
    }

    let queryText = `
      SELECT e.*, t.name as team_name
      FROM events e
      LEFT JOIN teams t ON e.team_id = t.id
      WHERE (t.coach_id = $1 OR e.club_id = $2)
    `;
    const queryParams = [req.params.id, staff.club_id];
    let paramCount = 2;

    // Filter by date range if provided
    if (startDate) {
      paramCount++;
      queryText += ` AND e.event_date >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      queryText += ` AND e.event_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    queryText += ` ORDER BY e.event_date ASC, e.event_time ASC`;

    const eventsResult = await query(queryText, queryParams);

    // Group events by date for easier calendar display
    const eventsByDate = eventsResult.rows.reduce((acc, event) => {
      const date = event.event_date.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(event);
      return acc;
    }, {});

    res.json({
      staff: {
        id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        role: staff.role,
      },
      events: eventsResult.rows,
      events_by_date: eventsByDate,
    });
  } catch (error) {
    console.error("Get staff schedule error:", error);
    res.status(500).json({
      error: "Failed to fetch schedule",
    });
  }
});

module.exports = router;
