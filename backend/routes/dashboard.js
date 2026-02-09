const express = require("express");
const { query, queries } = require("../config/database");
const {
  authenticateToken,
  requireOrganization,
} = require("../middleware/auth");

const router = express.Router();

// Get admin dashboard data
router.get(
  "/admin",
  authenticateToken,
  requireOrganization,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const { clubId } = req.query;

      // Get user's organizations
      const clubsResult = await query(
        "SELECT * FROM organizations WHERE owner_id = $1 ORDER BY created_at DESC",
        [userId],
      );
      let clubs = clubsResult.rows;

      if (clubs.length === 0) {
        return res.json({
          clubs: [],
          players: [],
          staff: [],
          events: [],
          teams: [],
          payments: [],
          statistics: {
            total_clubs: 0,
            total_players: 0,
            total_staff: 0,
            total_events: 0,
            total_teams: 0,
            monthly_revenue: 0,
          },
        });
      }

      // Filter clubs if a specific clubId is requested for the context
      let targetClubIds = clubs.map((c) => c.id);
      console.log(
        `🔍 Admin Dashboard Init - User: ${userId}, Request ClubId: ${clubId}`,
      );
      console.log(
        `   User owned clubs: ${clubs.map((c) => `${c.name} (${c.id})`).join(", ")}`,
      );

      if (clubId) {
        // Verify ownership/access
        const targetClub = clubs.find((c) => c.id === clubId);
        if (targetClub) {
          targetClubIds = [clubId];
          console.log(`   ✅ Target club validated: ${targetClub.name}`);
        } else {
          console.warn(
            `   ⚠️ Target club ${clubId} not found in owned clubs! Defaulting to ALL.`,
          );
        }
      }

      const clubIdPlaceholders = targetClubIds
        .map((_, i) => `$${i + 1}`)
        .join(",");

      // Get players with team assignments
      const playersResult = await query(
        `
  SELECT 
    p.*,
    CASE WHEN pp.plan_id IS NOT NULL THEN true ELSE false END as has_payment_plan,
    pl.name as payment_plan_name,
    COALESCE(
      json_agg(
        json_build_object(
          'team_id', tp.team_id,
          'team_name', t.name,
          'position', tp.position,
          'jersey_number', tp.jersey_number
        ) ORDER BY t.name
      ) FILTER (WHERE tp.team_id IS NOT NULL), 
      '[]'
    ) as team_assignments
  FROM players p
  LEFT JOIN team_players tp ON p.id = tp.player_id
  LEFT JOIN teams t ON tp.team_id = t.id
  LEFT JOIN player_plans pp ON pp.user_id = p.user_id AND pp.is_active = true
  LEFT JOIN plans pl ON pl.id = pp.plan_id
  WHERE p.club_id = ANY($1)
  GROUP BY p.id, pp.plan_id, pl.name
  ORDER BY p.created_at DESC
`,
        [targetClubIds],
      );

      // Get staff
      const staffResult = await query(
        `
      SELECT * FROM staff 
      WHERE club_id = ANY($1)
      ORDER BY created_at DESC
    `,
        [targetClubIds],
      );

      // Get teams with player counts
      const teamsResult = await query(
        `
      SELECT 
        t.*,
        COUNT(tp.player_id) as player_count,
        s.first_name as coach_first_name,
        s.last_name as coach_last_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'first_name', p.first_name,
              'last_name', p.last_name,
              'position', tp.position,
              'jersey_number', tp.jersey_number
            ) ORDER BY p.last_name
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'
        ) as players
      FROM teams t
      LEFT JOIN team_players tp ON t.id = tp.team_id
      LEFT JOIN players p ON tp.player_id = p.id
      LEFT JOIN staff s ON t.coach_id = s.id
      WHERE t.club_id = ANY($1)
      GROUP BY t.id, s.first_name, s.last_name
      ORDER BY t.created_at DESC
    `,
        [targetClubIds],
      );

      // Get events
      const eventsResult = await query(
        `
      SELECT * FROM events 
      WHERE club_id = ANY($1)
      ORDER BY event_date DESC
    `,
        [targetClubIds],
      );

      // Get payments
      const paymentsResult = await query(
        `
      SELECT p.*, pl.first_name as player_first_name, pl.last_name as player_last_name
      FROM payments p
      JOIN players pl ON p.player_id = pl.id
      WHERE p.club_id = ANY($1)
      ORDER BY p.due_date DESC
    `,
        [targetClubIds],
      );

      // Get invitations count
      const invitesResult = await query(
        "SELECT COUNT(*) as count FROM invitations WHERE organization_id = ANY($1) AND status = 'pending'",
        [targetClubIds],
      );
      const pendingInvitesCount = parseInt(invitesResult.rows[0].count) || 0;

      // Calculate statistics
      const totalPlayers = playersResult.rows.length + pendingInvitesCount;
      const totalStaff = staffResult.rows.length;
      const totalEvents = eventsResult.rows.length;
      const totalTeams = teamsResult.rows.length;
      const monthlyRevenue = playersResult.rows.reduce(
        (sum, player) => sum + (parseFloat(player.monthly_fee) || 0),
        0,
      );

      res.json({
        clubs,
        players: playersResult.rows,
        staff: staffResult.rows,
        events: eventsResult.rows,
        teams: teamsResult.rows,
        payments: paymentsResult.rows,
        statistics: {
          total_clubs: clubs.length,
          total_players: totalPlayers,
          pending_invites: pendingInvitesCount,
          total_staff: totalStaff,
          total_events: totalEvents,
          total_teams: totalTeams,
          monthly_revenue: monthlyRevenue,
        },
      });
    } catch (error) {
      console.error("Get admin dashboard error:", error);
      res.status(500).json({
        error: "Failed to fetch dashboard data",
        message: "An error occurred while fetching dashboard data",
        details: error.message,
      });
    }
  },
);

// 🔥 FIXED: Get player dashboard data with profile/family support
router.get("/player", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { playerId, clubId } = req.query;
    console.log(
      `🔍 DASHBOARD REQUEST: userId=${userId} playerId=${playerId} clubId=${clubId}`,
    );

    let player = null;
    let clubIds = clubId ? [clubId] : [];

    // 1. If specific playerId provided (e.g. from Family Switcher)
    if (playerId) {
      console.log("🔍 Fetching data for specific player profile:", playerId);
      const playerRes = await query(
        `
        SELECT p.*, c.name as club_name, c.id as club_id
        FROM players p
        LEFT JOIN organizations c ON p.club_id = c.id
        WHERE p.id = $1
      `,
        [playerId],
      );

      if (playerRes.rows.length > 0) {
        player = playerRes.rows[0];
        // If we are viewing a specific child, their club IS the context.
        // We override any requested clubId with the player's actual club.
        if (player.club_id) {
          console.log(
            `🎯 Context Switch: Overriding clubId ${clubId} with player's club ${player.club_id}`,
          );
          clubIds = [player.club_id];
        }
      }
    }

    // 2. If no playerId provided (main profile) OR we need to find the user's local instance in a specific club
    if (!player && clubId) {
      console.log("🔍 Fetching user instance for specific club:", clubId);
      const playerRes = await query(
        `
            SELECT p.*, c.name as club_name, c.id as club_id
            FROM players p
            LEFT JOIN organizations c ON p.club_id = c.id
            WHERE p.user_id = $1 AND p.club_id = $2
            ORDER BY p.created_at DESC LIMIT 1
        `,
        [userId, clubId],
      );

      if (playerRes.rows.length > 0) {
        player = playerRes.rows[0];
      }
    }

    // 3. Absolute Fallback: If still no player found, pick the most recent player record for this user
    if (!player) {
      console.log("🔍 Fallback: Fetching player record for user:", userId);
      const userRes = await query("SELECT email FROM users WHERE id = $1", [
        userId,
      ]);
      const userEmail = userRes.rows[0]?.email;

      // Try to find a player record that matches the user's email (indicates it's the Adult's OWN record)
      const playerRes = await query(
        `
        SELECT p.*, c.name as club_name, c.id as club_id
        FROM players p
        LEFT JOIN organizations c ON p.club_id = c.id
        WHERE p.user_id = $1
        ORDER BY (CASE WHEN p.email = $2 THEN 0 ELSE 1 END), p.created_at DESC 
        LIMIT 1
      `,
        [userId, userEmail],
      );

      if (playerRes.rows.length > 0) {
        player = playerRes.rows[0];
        if (clubIds.length === 0 && player.club_id) {
          clubIds = [player.club_id];
        }
      }
    }
    // 3. If we still have no clubIds but the user has some, use them as fallback
    // IMPORTANT: Only show clubs where the player has an actual player record (has been added to the club)
    // NOT just organization_members entries (which might be pending invitations)
    if (clubIds.length === 0) {
      const userClubs = await query(
        `
         SELECT DISTINCT club_id FROM players 
         WHERE user_id = $1
       `,
        [userId],
      );
      clubIds = userClubs.rows.map((r) => r.club_id);
    }

    let attendance = null;
    if (player) {
      attendance = player.attendance_rate;
      console.log("attendance is:", attendance);
    }

    let clubs = [];
    if (clubIds.length > 0) {
      const clubsResult = await query(
        `
        SELECT o.*,
               (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id AND role = 'player') as member_count
        FROM organizations o WHERE o.id = ANY($1)
      `,
        [clubIds],
      );
      clubs = clubsResult.rows;
    }

    // Get player's teams (only if player exists)
    let teams = [];
    if (player) {
      const teamsResult = await query(
        `
        SELECT t.*, 
               tp.position as player_position,
               tp.jersey_number,
               s.first_name as coach_first_name,
               s.last_name as coach_last_name,
               s.email as coach_email
        FROM teams t
        JOIN team_players tp ON t.id = tp.team_id
        LEFT JOIN staff s ON t.coach_id = s.id
        WHERE tp.player_id = $1 AND t.club_id = ANY($2)
        ORDER BY t.name
      `,
        [player.id, clubIds],
      );
      teams = teamsResult.rows;
    }

    // Get player's team IDs
    const teamIds = teams.map((t) => t.id);

    // Get relevant events (Team events + Club events)
    let eventsQuery = `
      SELECT e.*, c.name as club_name
      FROM events e
      LEFT JOIN organizations c ON e.club_id = c.id
      WHERE e.event_date >= CURRENT_DATE
    `;

    const queryParams = [];
    let paramCount = 0;

    // If player has a club or teams, filter by them
    if (clubIds.length > 0 || teamIds.length > 0) {
      eventsQuery += ` AND (`;

      const conditions = [];

      if (clubIds.length > 0) {
        paramCount++;
        conditions.push(`e.club_id = ANY($${paramCount})`);
        queryParams.push(clubIds);
      }

      if (teamIds.length > 0) {
        paramCount++;
        conditions.push(`e.team_id = ANY($${paramCount})`);
        queryParams.push(teamIds);
      }

      eventsQuery += conditions.join(" OR ");
      eventsQuery += `)`;
    } else {
      // Fallback for unassigned players: show public events or nothing?
      // Showing nothing is safer/cleaner for "My Dashboard"
      eventsQuery += ` AND 1=0`;
      // actually, maybe they want to see "Open" events?
      // For now, let's just show nothing if they have no club/team.
    }

    eventsQuery += ` ORDER BY e.event_date ASC LIMIT 50`;

    const eventsResult = await query(eventsQuery, queryParams);

    // Get player's payments (only if player exists)
    let payments = [];
    if (player) {
      const paymentsResult = await query(
        `
        SELECT * FROM payments
        WHERE player_id = $1 AND club_id = ANY($2)
        ORDER BY due_date DESC
      `,
        [player.id, clubIds],
      );
      payments = paymentsResult.rows;
    }

    // Get player's bookings
    let bookings = [];
    if (player) {
      console.log("🔍 Fetching bookings for player:", player.id);
      const bookingsResult = await query(
        `
        SELECT eb.*, e.title as event_title, e.event_date
        FROM event_bookings eb
        JOIN events e ON eb.event_id = e.id
        WHERE eb.player_id = $1 AND e.club_id = ANY($2)
        ORDER BY e.event_date DESC
      `,
        [player.id, clubIds],
      );
      bookings = bookingsResult.rows;
    } else {
      // Fallback: show bookings where user is the specific user and no player_id is assigned
      // (direct user bookings)
      const bookingsResult = await query(
        `
        SELECT eb.*, e.title as event_title, e.event_date
        FROM event_bookings eb
        JOIN events e ON eb.event_id = e.id
        WHERE eb.user_id = $1 AND eb.player_id IS NULL
        ORDER BY e.event_date DESC
      `,
        [userId],
      );
      bookings = bookingsResult.rows;
    }

    // Get player's applications
    const applicationsResult = await query(
      `
      SELECT ca.*, c.name as club_name
      FROM club_applications ca
      JOIN organizations c ON ca.club_id = c.id
      WHERE ca.user_id = $1
      ORDER BY ca.submitted_at DESC
    `,
      [userId],
    );

    // Get pending invitations
    const invitationsResult = await query(
      `
      SELECT om.*, c.name as club_name, c.logo_url
      FROM organization_members om
      JOIN organizations c ON om.organization_id = c.id
      WHERE om.user_id = $1 AND om.status = 'pending'
      ORDER BY om.created_at DESC
    `,
      [userId],
    );

    console.log("📊 Player dashboard data loaded:", {
      hasPlayer: !!player,
      clubsCount: clubs.length,
      teamsCount: teams.length,
      eventsCount: eventsResult.rows.length,
      paymentsCount: payments.length,
      invitationsCount: invitationsResult.rows.length,
      applicationsCount: applicationsResult.rows.length,
    });

    if (player) {
      player.age = calculateAge(player.date_of_birth);
    }

    res.json({
      player,
      attendance,
      clubs,
      teams,
      events: eventsResult.rows,
      payments,
      bookings,
      applications: applicationsResult.rows,
      invitations: invitationsResult.rows,
    });
  } catch (error) {
    console.error("Get player dashboard error:", error);
    res.status(500).json({
      error: "Failed to fetch player dashboard data",
      message: "An error occurred while fetching player dashboard data",
      details: error.message,
    });
  }
});

// Helper function to calculate age
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
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

// Accept an invitation
router.post(
  "/invitations/:orgId/accept",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { orgId } = req.params;

      // Check if there is a pending invitation
      const inviteCheck = await query(
        `SELECT * FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND status = 'pending'`,
        [orgId, userId],
      );

      if (inviteCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "No pending invitation found for this club" });
      }

      // Update status to active
      await query(
        `UPDATE organization_members SET status = 'active' WHERE organization_id = $1 AND user_id = $2`,
        [orgId, userId],
      );

      res.json({ success: true, message: "Invitation accepted successfully!" });
    } catch (error) {
      console.error("Accept invitation error:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  },
);

// Decline an invitation
router.post(
  "/invitations/:orgId/decline",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { orgId } = req.params;

      // Delete the pending membership
      await query(
        `DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND status = 'pending'`,
        [orgId, userId],
      );

      res.json({ success: true, message: "Invitation declined" });
    } catch (error) {
      console.error("Decline invitation error:", error);
      res.status(500).json({ error: "Failed to decline invitation" });
    }
  },
);

module.exports = router;
