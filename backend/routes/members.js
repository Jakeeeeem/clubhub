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
    
    if (!orgId) {
      return res.status(403).json({ error: "No active organization selected" });
    }

    const { role } = req.query;
    
    let queryText = `
      SELECT 
        u.id, 
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
    
    // Format to matches what the frontend expects
    // The frontend looks for .players, .coaches, .admins, or .members
    const members = result.rows;
    const players = members.filter(m => m.role === 'player');
    const coaches = members.filter(m => m.role === 'coach' || m.role === 'assistant-coach' || m.role === 'staff');
    const admins = members.filter(m => m.role === 'admin' || m.role === 'owner' || m.role === 'manager');

    res.json({
      success: true,
      members,
      players,
      coaches,
      admins
    });
  } catch (error) {
    console.error("Failed to fetch members:", error);
    res.status(500).json({ error: "Internal server error" });
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
