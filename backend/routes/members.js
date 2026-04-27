const express = require("express");
const { pool } = require("../config/database");
const { authenticateToken, injectOrgContext } = require("../middleware/auth");

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
