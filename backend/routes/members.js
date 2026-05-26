const express = require("express");
const { pool, withTransaction } = require("../config/database");
const { authenticateToken, injectOrgContext, requireOrganization } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/members
 * Unified endpoint for fetching members of the current active organization.
 */
router.get("/", authenticateToken, injectOrgContext, async (req, res) => {
  try {
    const orgId = req.user.organization_id;

    if (!orgId) {
      return res.status(403).json({ error: "No active organization selected" });
    }

    // 1. Fetch organization members joined with user info
    const membersResult = await pool.query(
      `SELECT
        om.user_id,
        om.role,
        om.status,
        om.created_at AS joined_at,
        u.first_name,
        u.last_name,
        u.email,
        p.id        AS player_id,
        p.position,
        p.date_of_birth,
        tp.team_id
      FROM organization_members om
      JOIN users u ON u.id = om.user_id
      LEFT JOIN players p ON p.user_id = om.user_id AND p.club_id = $1
      LEFT JOIN team_players tp ON tp.player_id = p.id
      WHERE om.organization_id = $1
      ORDER BY om.created_at DESC`,
      [orgId]
    );

    // 2. Fetch pending invites
    const invitesResult = await pool.query(
      `SELECT
        i.id   AS invite_id,
        i.email,
        i.role AS invite_role,
        i.team_id,
        i.first_name,
        i.last_name,
        sp.name  AS plan_name,
        sp.amount AS plan_amount,
        sp.interval AS plan_interval
      FROM invitations i
      LEFT JOIN subscription_plans sp ON sp.id = i.plan_id
      WHERE i.organization_id = $1
        AND i.status = 'pending'
      ORDER BY i.created_at DESC`,
      [orgId]
    ).catch(() => ({ rows: [] })); // graceful fallback if table doesn't exist yet

    // 3. Deduplicate members by user_id (user may appear in multiple team rows)
    const membersByKey = new Map();

    const addMemberRow = (normalized) => {
      const key = normalized.id;
      if (!membersByKey.has(key)) {
        membersByKey.set(key, normalized);
      }
    };

    membersResult.rows.forEach(row => {
      addMemberRow({
        id: row.user_id,
        user_id: row.user_id,
        first_name: row.first_name || null,
        last_name: row.last_name || null,
        email: row.email || null,
        role: row.role || 'member',
        status: row.status || 'active',
        source: 'member',
        player_id: row.player_id || null,
        position: row.position || null,
        date_of_birth: row.date_of_birth || null,
        team_id: row.team_id || null,
        joined_at: row.joined_at || null,
        payment_status: 'n/a',
        join_status: 'joined',
      });
    });

    // 4. Add pending invites as pseudo-members
    invitesResult.rows.forEach(inv => {
      addMemberRow({
        id: `invite-${inv.invite_id}`,
        invite_id: inv.invite_id,
        user_id: null,
        first_name: inv.first_name || null,
        last_name: inv.last_name || null,
        email: inv.email || null,
        role: inv.invite_role || 'player',
        status: 'pending',
        source: 'invite',
        team_id: inv.team_id || null,
        plan_name: inv.plan_name || null,
        plan_amount: inv.plan_amount || null,
        plan_interval: inv.plan_interval || null,
        payment_status: inv.plan_name ? 'due' : 'n/a',
        join_status: 'invited',
      });
    });

    const members = Array.from(membersByKey.values());
    const players = members.filter(m => (m.role || '').toString().toLowerCase() === 'player');
    const staff = members.filter(m =>
      ['coach', 'assistant-coach', 'staff', 'admin', 'owner', 'manager'].includes(
        (m.role || '').toString().toLowerCase()
      )
    );

    res.json({ success: true, members, players, staff });
  } catch (error) {
    console.error("Failed to fetch members:", error);
    res.status(500).json({ error: "Internal server error", detail: error.message });
  }
});

/**
 * POST /api/members/:id/update  (and alias POST /api/members/:id)
 * Update a member's details across users and role-specific tables.
 */
async function updateMemberHandler(req, res) {
  const targetUserId = req.params.id;
  const orgId = req.user.organization_id;
  const {
    first_name,
    last_name,
    email,
    role,
    dateOfBirth,
    date_of_birth,
    position,
    teamId,
    team_id,
  } = req.body;

  const dob = dateOfBirth || date_of_birth || null;
  const squadTeamId = teamId || team_id || null;

  try {
    if (!orgId) return res.status(403).json({ error: "No active organization" });

    // Prevent acting on invite pseudo-ids
    if (String(targetUserId).startsWith('invite-')) {
      return res.status(400).json({ error: 'Use invites endpoints to update pending invites' });
    }

    // Owner protection
    const orgRes = await pool.query('SELECT owner_id FROM organizations WHERE id = $1', [orgId]);
    if (orgRes.rows.length === 0) return res.status(404).json({ error: 'Organization not found' });
    const isOwner = String(orgRes.rows[0].owner_id) === String(targetUserId);

    if (isOwner && role && role !== 'owner') {
      return res.status(403).json({ error: 'Cannot change owner role' });
    }

    await withTransaction(async (client) => {
      // Update user basic info
      if (first_name || last_name || email) {
        await client.query(
          `UPDATE users
           SET first_name = COALESCE($1, first_name),
               last_name  = COALESCE($2, last_name),
               email      = COALESCE($3, email)
           WHERE id = $4`,
          [first_name || null, last_name || null, email || null, targetUserId]
        );
      }

      // Update org member role
      if (role) {
        await client.query(
          'UPDATE organization_members SET role = $1 WHERE organization_id = $2 AND user_id = $3',
          [role, orgId, targetUserId]
        );
      }

      // Fetch user info from DB if fields are missing in body
      let finalFirstName = first_name;
      let finalLastName = last_name;
      let finalEmail = email;

      if (!finalFirstName || !finalLastName || !finalEmail) {
        const userRes = await client.query('SELECT first_name, last_name, email FROM users WHERE id = $1', [targetUserId]);
        if (userRes.rows.length > 0) {
          if (!finalFirstName) finalFirstName = userRes.rows[0].first_name;
          if (!finalLastName) finalLastName = userRes.rows[0].last_name;
          if (!finalEmail) finalEmail = userRes.rows[0].email;
        }
      }

      // Resolve the member's role (current or new)
      let memberRole = role;
      if (!memberRole) {
        const roleRes = await client.query(
          'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
          [orgId, targetUserId]
        );
        if (roleRes.rows.length > 0) {
          memberRole = roleRes.rows[0].role;
        }
      }
      const normalizedRole = (memberRole || '').toString().toLowerCase();

      if (normalizedRole === 'player') {
        const playerRes = await client.query(
          'SELECT id FROM players WHERE user_id = $1 AND club_id = $2',
          [targetUserId, orgId]
        );

        let playerId;
        if (playerRes.rows.length > 0) {
          playerId = playerRes.rows[0].id;
          await client.query(
            `UPDATE players
             SET first_name    = COALESCE($1, first_name),
                 last_name     = COALESCE($2, last_name),
                 email         = COALESCE($3, email),
                 date_of_birth = COALESCE($4, date_of_birth),
                 position      = COALESCE($5, position)
             WHERE id = $6`,
            [finalFirstName || null, finalLastName || null, finalEmail || null, dob, position || null, playerId]
          );
        } else {
          const newPlayer = await client.query(
            `INSERT INTO players (user_id, club_id, first_name, last_name, email, date_of_birth, position)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [targetUserId, orgId, finalFirstName, finalLastName, finalEmail, dob, position]
          );
          playerId = newPlayer.rows[0].id;
        }

        // Handle squad assignment
        if (playerId) {
          await client.query(
            'DELETE FROM team_players WHERE player_id = $1 AND team_id IN (SELECT id FROM teams WHERE club_id = $2)',
            [playerId, orgId]
          );
          if (squadTeamId) {
            await client.query(
              'INSERT INTO team_players (team_id, player_id, position) VALUES ($1, $2, $3)',
              [squadTeamId, playerId, position || null]
            );
          }
        }
      } else if (['staff', 'coach', 'admin', 'owner'].includes(normalizedRole)) {
        // Map role to valid check constraint value on staff.role:
        // 'coach', 'assistant-coach', 'treasurer', 'coaching-supervisor', 'referee', 'administrator'
        let staffRole = null;
        if (normalizedRole === 'coach') {
          staffRole = 'coach';
        } else if (normalizedRole === 'assistant-coach' || normalizedRole === 'assistant_coach') {
          staffRole = 'assistant-coach';
        } else if (normalizedRole === 'admin' || normalizedRole === 'administrator') {
          staffRole = 'administrator';
        } else if (normalizedRole === 'staff') {
          staffRole = 'coach'; // default fallback if inserting new staff, otherwise keep existing
        }

        const existingStaff = await client.query(
          'SELECT id, role FROM staff WHERE user_id = $1 AND club_id = $2',
          [targetUserId, orgId]
        );
        if (existingStaff.rows.length > 0) {
          const currentStaffRole = existingStaff.rows[0].role;
          const finalRole = staffRole || currentStaffRole;
          await client.query(
            `UPDATE staff
             SET role       = COALESCE($1, role),
                 first_name = COALESCE($2, first_name),
                 last_name  = COALESCE($3, last_name),
                 email      = COALESCE($4, email)
             WHERE user_id = $5 AND club_id = $6`,
            [finalRole, finalFirstName || null, finalLastName || null, finalEmail || null, targetUserId, orgId]
          );
        } else if (staffRole) {
          // Only insert if we have a valid staffRole (e.g. skip for 'owner' who isn't staff by default)
          await client.query(
            `INSERT INTO staff (user_id, club_id, role, first_name, last_name, email)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [targetUserId, orgId, staffRole, finalFirstName, finalLastName, finalEmail]
          );
        }
      }
    });

    res.json({ success: true, message: 'Member updated successfully' });
  } catch (err) {
    console.error('Update member error:', err);
    if (err && err.code === '23505') {
      return res.status(400).json({ error: 'Unique constraint violation', detail: err.detail || err.message });
    }
    if (err && err.code === '23503') {
      return res.status(400).json({ error: 'Foreign key violation', detail: err.detail || err.message });
    }
    res.status(500).json({ error: err && err.message ? err.message : 'Failed to update member' });
  }
}

router.post('/:id/update', authenticateToken, injectOrgContext, requireOrganization, updateMemberHandler);
// Alias: some frontend calls POST /api/members/:id directly
router.post('/:id', authenticateToken, injectOrgContext, requireOrganization, (req, res, next) => {
  // Skip if this is the "update" sub-route (handled above) or a DELETE
  updateMemberHandler(req, res, next);
});

/**
 * DELETE /api/members/:id - remove a member from the current organization
 */
router.delete('/:id', authenticateToken, injectOrgContext, requireOrganization, async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const targetUserId = req.params.id;

    if (!orgId) return res.status(403).json({ error: 'No active organization' });

    const orgResult = await pool.query('SELECT id, owner_id FROM organizations WHERE id = $1', [orgId]);
    if (orgResult.rows.length === 0) return res.status(404).json({ error: 'Organization not found' });
    const org = orgResult.rows[0];

    if (String(org.owner_id) === String(targetUserId)) {
      return res.status(403).json({ error: 'Cannot remove owner' });
    }

    // Check authorization
    let isAuthorized = String(req.user.id) === String(org.owner_id);
    if (!isAuthorized) {
      const staffRes = await pool.query('SELECT role FROM staff WHERE user_id = $1 AND club_id = $2', [req.user.id, orgId]);
      if (staffRes.rows.length > 0 && staffRes.rows[0].role === 'admin') isAuthorized = true;
    }
    if (!isAuthorized) return res.status(403).json({ error: 'Access denied' });

    const memberRes = await pool.query(
      'SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [orgId, targetUserId]
    );
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found in organization' });
    }

    await withTransaction(async (client) => {
      await client.query('DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2', [orgId, targetUserId]);
      await client.query('UPDATE organizations SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [orgId]);
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error('Delete member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;
