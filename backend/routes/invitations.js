const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');
const emailService = require('../services/email-service');

// ============================================================================
// INVITATION ROUTES
// ============================================================================

/**
 * POST /api/organizations/:orgId/invite
 * Invite a user to join an organization
 */
router.post('/:orgId/invite', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { orgId } = req.params;
    const userId = req.user.id;
    const { email, role, message } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email and role are required'
      });
    }

    // Validate role
    const validRoles = ['admin', 'coach', 'assistant_coach', 'player', 'parent', 'staff', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }

    await client.query('BEGIN');

    // Check if inviter has permission
    const permissionCheck = await client.query(`
      SELECT role FROM organization_members
      WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
    `, [orgId, userId]);

    if (permissionCheck.rows.length === 0 || 
        !['owner', 'admin'].includes(permissionCheck.rows[0].role)) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to invite users'
      });
    }

    // Check if user already exists and is a member
    const existingUser = await client.query(`
      SELECT u.id FROM users u
      WHERE u.email = $1
    `, [email]);

    if (existingUser.rows.length > 0) {
      const existingMember = await client.query(`
        SELECT 1 FROM organization_members
        WHERE organization_id = $1 AND user_id = $2
      `, [orgId, existingUser.rows[0].id]);

      if (existingMember.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'User is already a member of this organization'
        });
      }
    }

    // Check for existing pending invitation
    const existingInvite = await client.query(`
      SELECT id FROM invitations
      WHERE organization_id = $1 AND email = $2 AND status = 'pending'
    `, [orgId, email]);

    if (existingInvite.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'A pending invitation already exists for this email'
      });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation
    const inviteResult = await client.query(`
      INSERT INTO invitations (
        organization_id, email, role, invited_by, token, message, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [orgId, email, role, userId, token, message, expiresAt]);

    await client.query('COMMIT');

    const invitation = inviteResult.rows[0];

    // Get organization name for email
    const orgResult = await client.query('SELECT name FROM organizations WHERE id = $1', [orgId]);
    const orgName = orgResult.rows[0]?.name || 'a club';
    
    // Get inviter name
    const inviterResult = await client.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    const inviterName = inviterResult.rows[0] ? `${inviterResult.rows[0].first_name} ${inviterResult.rows[0].last_name}` : 'A Club Administrator';

    // Send email with invitation link
    try {
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:8000'}/invite-page.html?token=${token}`;
      
      await emailService.sendClubInviteEmail({
        email,
        clubName: orgName,
        inviterName,
        inviteLink,
        personalMessage: message,
        isPublic: false,
        clubRole: role
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // We don't rollback here because the invite is still created in the DB
    }

    res.status(201).json({
      success: true,
      invitation,
      inviteLink: `/invite-page.html?token=${token}`,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invitation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create invitation'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/invitations/:token
 * Get invitation details by token
 */
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(`
      SELECT 
        i.*,
        o.name as organization_name,
        o.logo_url as organization_logo,
        u.first_name as invited_by_first_name,
        u.last_name as invited_by_last_name
      FROM invitations i
      INNER JOIN organizations o ON i.organization_id = o.id
      INNER JOIN users u ON i.invited_by = u.id
      WHERE i.token = $1
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    const invitation = result.rows[0];

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(410).json({
        success: false,
        error: 'Invitation has expired'
      });
    }

    // Check if already accepted/declined
    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Invitation has already been ${invitation.status}`
      });
    }

    res.json({
      success: true,
      invitation
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invitation'
    });
  }
});

/**
 * POST /api/invitations/:token/accept
 * Accept an invitation
 */
router.post('/:token/accept', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { token } = req.params;
    const userId = req.user.id;

    await client.query('BEGIN');

    // Get invitation
    const inviteResult = await client.query(`
      SELECT * FROM invitations WHERE token = $1
    `, [token]);

    if (inviteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    const invitation = inviteResult.rows[0];

    // Validate invitation
    if (invitation.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Invitation has already been ${invitation.status}`
      });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(410).json({
        success: false,
        error: 'Invitation has expired'
      });
    }

    // Check if user's email matches invitation
    const userResult = await client.query(`
      SELECT email FROM users WHERE id = $1
    `, [userId]);

    if (userResult.rows[0].email !== invitation.email) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'This invitation is for a different email address'
      });
    }

    // Check if already a member
    const memberCheck = await client.query(`
      SELECT 1 FROM organization_members
      WHERE organization_id = $1 AND user_id = $2
    `, [invitation.organization_id, userId]);

    if (memberCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'You are already a member of this organization'
      });
    }

    // Add user to organization
    await client.query(`
      INSERT INTO organization_members (
        organization_id, user_id, role, status, invited_by, invited_at
      ) VALUES ($1, $2, $3, 'active', $4, $5)
    `, [
      invitation.organization_id,
      userId,
      invitation.role,
      invitation.invited_by,
      invitation.created_at
    ]);

    // Update invitation status
    await client.query(`
      UPDATE invitations
      SET status = 'accepted', accepted_at = NOW(), accepted_by = $1
      WHERE id = $2
    `, [userId, invitation.id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      organization_id: invitation.organization_id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error accepting invitation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept invitation'
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/invitations/:token/decline
 * Decline an invitation
 */
router.post('/:token/decline', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(`
      UPDATE invitations
      SET status = 'declined'
      WHERE token = $1 AND status = 'pending'
      RETURNING *
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found or already processed'
      });
    }

    res.json({
      success: true,
      message: 'Invitation declined'
    });
  } catch (error) {
    console.error('Error declining invitation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decline invitation'
    });
  }
});

/**
 * GET /api/organizations/:orgId/invitations
 * Get all invitations for an organization
 */
router.get('/:orgId/invitations', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;

    // Check permission
    const permissionCheck = await pool.query(`
      SELECT role FROM organization_members
      WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
    `, [orgId, userId]);

    if (permissionCheck.rows.length === 0 || 
        !['owner', 'admin'].includes(permissionCheck.rows[0].role)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view invitations'
      });
    }

    const result = await pool.query(`
      SELECT 
        i.*,
        u.first_name as invited_by_first_name,
        u.last_name as invited_by_last_name
      FROM invitations i
      INNER JOIN users u ON i.invited_by = u.id
      WHERE i.organization_id = $1
      ORDER BY i.created_at DESC
    `, [orgId]);

    res.json({
      success: true,
      invitations: result.rows
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invitations'
    });
  }
});

module.exports = router;
