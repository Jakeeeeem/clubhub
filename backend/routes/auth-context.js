const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// ============================================================================
// ORGANIZATION SWITCHING & USER CONTEXT
// ============================================================================

/**
 * POST /api/auth/switch-organization
 * Switch the user's current organization context
 */
router.post('/switch-organization', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required'
      });
    }

    // Verify user is a member of this organization
    const memberCheck = await pool.query(`
      SELECT om.role, o.* 
      FROM organization_members om
      INNER JOIN organizations o ON om.organization_id = o.id
      WHERE om.organization_id = $1 
      AND om.user_id = $2 
      AND om.status = 'active'
    `, [organizationId, userId]);

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this organization'
      });
    }

    // Update user preference
    await pool.query(`
      INSERT INTO user_preferences (user_id, current_organization_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE
      SET current_organization_id = $2, updated_at = NOW()
    `, [userId, organizationId]);

    const organization = memberCheck.rows[0];

    res.json({
      success: true,
      currentOrganization: {
        ...organization,
        userRole: organization.role
      },
      message: 'Organization switched successfully'
    });
  } catch (error) {
    console.error('Error switching organization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch organization'
    });
  }
});

/**
 * GET /api/auth/context
 * Get the user's current context (user + clubs they own/belong to)
 */
router.get('/context', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get user info and preferences
    const userResult = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.account_type, 
             up.current_organization_id
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = userResult.rows[0];

    // 2. Get all organizations the user is a member of
    const orgsResult = await pool.query(`
      SELECT 
        o.id, o.name, o.sport, o.location, o.slug, o.logo_url,
        om.role as user_role, om.status as member_status
      FROM organizations o
      INNER JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = $1 AND om.status = 'active'
      ORDER BY o.name ASC
    `, [userId]);

    const organizations = orgsResult.rows;

    // 3. Determine current organization
    let currentOrg = null;
    if (userData.current_organization_id) {
        currentOrg = organizations.find(o => o.id === userData.current_organization_id);
    }
    
    // Fallback: Use first organization if current isn't set or no longer valid
    if (!currentOrg && organizations.length > 0) {
        currentOrg = organizations[0];
        
        // Update preference in background if not already set
        pool.query('UPDATE user_preferences SET current_organization_id = $1 WHERE user_id = $2', [currentOrg.id, userId]).catch(console.error);
    }

    res.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        accountType: userData.account_type
      },
      organizations: organizations,
      currentOrganization: currentOrg,
      hasMultipleOrganizations: organizations.length > 1
    });
  } catch (error) {
    console.error('Error fetching user context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user context'
    });
  }
});

/**
 * GET /api/auth/me (Enhanced version)
 * Get current user with organization context
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        u.*,
        up.current_organization_id
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Get current organization if set
    if (user.current_organization_id) {
      const orgResult = await pool.query(`
        SELECT 
          o.*,
          om.role as user_role
        FROM organizations o
        INNER JOIN organization_members om ON o.id = om.organization_id
        WHERE o.id = $1 AND om.user_id = $2
      `, [user.current_organization_id, userId]);

      if (orgResult.rows.length > 0) {
        user.currentOrganization = orgResult.rows[0];
      }
    }

    // Remove sensitive data
    delete user.password_hash;

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data'
    });
  }
});

module.exports = router;
