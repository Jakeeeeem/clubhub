const express = require("express");
const { pool, withTransaction } = require("../config/database");
const { authenticateToken, injectOrgContext, requireOrganization } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/members
 * Unified endpoint for fetching members of the current active organization.
 * Used primarily by the SquadMessenger.
 */
router.get("/", authenticateToken, injectOrgContext, async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const fs = require('fs');
    
    if (!orgId) {
      return res.status(403).json({ error: "No active organization selected" });
    }

    const { role } = req.query;
    
    let queryText = `
      SELECT 
        u.id, 
        u.id as user_id,
        u.first_name, 
        u.last_name, 
        u.email, 
        om.role,
        om.status
      FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = $1 AND om.status = 'active'
    `;
    
    const params = [orgId];
    
    if (role) {
      queryText += " AND om.role = $2";
      params.push(role);
    }
    
    queryText += " ORDER BY u.first_name, u.last_name";
    
    const result = await pool.query(queryText, params);

    // Also include active players from the players table (covers cases where organization_members row is missing)
    const playersResult = await pool.query(
      `SELECT p.id as player_id, p.user_id, p.first_name, p.last_name, p.email, p.club_id
       FROM players p
       WHERE p.club_id = $1`,
      [orgId]
    );

    // Merge rows, preferring organization_members rows, but add any players missing from org members
    const membersByKey = new Map();
    function addMemberRow(r) {
      const key = r.user_id || r.email || r.id || r.player_id;
      if (!key) return;
      if (!membersByKey.has(String(key))) membersByKey.set(String(key), r);
      else {
        const existing = membersByKey.get(String(key));
        // Prefer existing data (from organization_members) to preserve roles like 'owner'
        membersByKey.set(String(key), Object.assign({}, r, existing));
      }
    }

    result.rows.forEach(addMemberRow);
    playersResult.rows.forEach(r => {
      // Normalize shape similar to org members
      const normalized = {
        id: r.user_id || r.player_id,
        user_id: r.user_id,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        role: 'player',
        status: 'active'
      };
      addMemberRow(normalized);
    });

    const members = Array.from(membersByKey.values());
    const players = members.filter(m => (m.role || '').toString().toLowerCase() === 'player');
    const staff = members.filter(m => ['coach', 'assistant-coach', 'staff', 'admin', 'owner', 'manager'].includes((m.role || '').toString().toLowerCase()));

    const response = { success: true, members, players, staff };
    try {
      require('fs').writeFileSync('/Users/christopherjcallaghan/Documents/sites/clubhub/scratch/last_members_resp.json', JSON.stringify({
        orgId,
        userId: req.user.id,
        response
      }, null, 2));
    } catch (e) {}

    res.json(response);
  } catch (error) {
    console.error("Failed to fetch members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/members/:id/update
 * Update a member's details across users and role-specific tables.
 */
router.post('/:id/update', authenticateToken, injectOrgContext, requireOrganization, async (req, res) => {
  const targetUserId = req.params.id;
  const orgId = req.user.organization_id;
  const { first_name, last_name, email, role, dateOfBirth, position, teamId } = req.body;

  try {
    if (!orgId) return res.status(403).json({ error: "No active organization" });

    // 1. Protection for owner
    const orgRes = await pool.query('SELECT owner_id FROM organizations WHERE id = $1', [orgId]);
    if (orgRes.rows.length === 0) return res.status(404).json({ error: 'Organization not found' });
    const isOwner = String(orgRes.rows[0].owner_id) === String(targetUserId);

    // If target is owner, prevent changing role or removing them
    if (isOwner && role && role !== 'owner') {
      return res.status(403).json({ error: 'Cannot change owner role' });
    }

    await withTransaction(async (client) => {
      // 2. Update user basic info (only if user exists)
      await client.query(
        'UPDATE users SET first_name = $1, last_name = $2, email = $3 WHERE id = $4',
        [first_name, last_name, email, targetUserId]
      );

      // 3. Update organization member role
      await client.query(
        'UPDATE organization_members SET role = $1 WHERE organization_id = $2 AND user_id = $3',
        [role, orgId, targetUserId]
      );

      // 4. Update role-specific tables
      if (role === 'player') {
        const playerRes = await client.query('SELECT id FROM players WHERE user_id = $1 AND club_id = $2', [targetUserId, orgId]);
        let playerId = null;
        
        if (playerRes.rows.length > 0) {
          playerId = playerRes.rows[0].id;
          await client.query(
            'UPDATE players SET first_name = $1, last_name = $2, email = $3, date_of_birth = $4, position = $5 WHERE id = $6',
            [first_name, last_name, email, dateOfBirth, position, playerId]
          );
        } else {
          const newPlayer = await client.query(
            'INSERT INTO players (user_id, club_id, first_name, last_name, email, date_of_birth, position) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [targetUserId, orgId, first_name, last_name, email, dateOfBirth, position]
          );
          playerId = newPlayer.rows[0].id;
        }

        // Handle squad assignment
        if (playerId) {
          if (teamId) {
            await client.query('DELETE FROM team_players WHERE player_id = $1 AND team_id IN (SELECT id FROM teams WHERE club_id = $2)', [playerId, orgId]);
            await client.query('INSERT INTO team_players (team_id, player_id, position) VALUES ($1, $2, $3)', [teamId, playerId, position]);
          } else {
            await client.query('DELETE FROM team_players WHERE player_id = $1 AND team_id IN (SELECT id FROM teams WHERE club_id = $2)', [playerId, orgId]);
          }
        }
      } else if (['staff', 'coach', 'admin', 'owner'].includes(role)) {
        await client.query(
          'INSERT INTO staff (user_id, club_id, role, first_name, last_name, email) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, club_id) DO UPDATE SET role = $3, first_name = $4, last_name = $5, email = $6',
          [targetUserId, orgId, role, first_name, last_name, email]
        );
      }
    });

    res.json({ success: true, message: 'Member updated successfully' });
  } catch (err) {
    console.error('Update member error:', err);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

module.exports = router;

// DELETE /api/members/:id - remove a member from the current organization
router.delete('/:id', authenticateToken, injectOrgContext, requireOrganization, async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const targetUserId = req.params.id;

    if (!orgId) return res.status(403).json({ error: 'No active organization' });

    // Find the organization and the member record
    const orgResult = await pool.query('SELECT id, owner_id FROM organizations WHERE id = $1', [orgId]);
    if (orgResult.rows.length === 0) return res.status(404).json({ error: 'Organization not found' });
    const org = orgResult.rows[0];

    // Prevent removing the owner
    if (String(org.owner_id) === String(targetUserId)) {
      return res.status(403).json({ error: 'Cannot remove owner', message: 'The owner of the organization cannot be removed' });
    }

    // Check authorization: must be owner or admin staff
    let isAuthorized = String(req.user.id) === String(org.owner_id);
    if (!isAuthorized) {
      const staffRes = await pool.query('SELECT role FROM staff WHERE user_id = $1 AND club_id = $2', [req.user.id, orgId]);
      if (staffRes.rows.length > 0 && staffRes.rows[0].role === 'admin') isAuthorized = true;
    }

    if (!isAuthorized) return res.status(403).json({ error: 'Access denied' });

    // Delete the organization_members row if present
    const memberRes = await pool.query('SELECT id FROM organization_members WHERE organization_id = $1 AND user_id = $2', [orgId, targetUserId]);
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
