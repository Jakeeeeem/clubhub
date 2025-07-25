const express = require('express');
const { query, queries, withTransaction } = require('../config/database');
const { authenticateToken, requireOrganization, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const router = express.Router();

const inviteValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('message').optional().trim(),
  body('clubRole').optional().isIn(['player', 'coach', 'staff']).withMessage('Invalid club role')
];

// 🔥 FIXED: GENERATE CLUB INVITE LINK WITH TEAM ASSIGNMENT
router.post('/generate', authenticateToken, requireOrganization, inviteValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { 
      email, 
      firstName, 
      lastName, 
      message, 
      clubRole = 'player',
      clubId,
      teamId, // NEW: Add team assignment
      isPublic = false
    } = req.body;

    // Get user's club
    let userClubId = clubId;
    if (!userClubId) {
      const clubResult = await query('SELECT id FROM clubs WHERE owner_id = $1 LIMIT 1', [req.user.id]);
      if (clubResult.rows.length === 0) {
        return res.status(404).json({
          error: 'No club found',
          message: 'You must have a club to send invites'
        });
      }
      userClubId = clubResult.rows[0].id;
    }

    // Verify user owns the club
    const clubResult = await query('SELECT * FROM clubs WHERE id = $1 AND owner_id = $2', [userClubId, req.user.id]);
    if (clubResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only send invites for your own club'
      });
    }

    const club = clubResult.rows[0];

    // Verify team belongs to club if specified
    if (teamId) {
      const teamResult = await query('SELECT id FROM teams WHERE id = $1 AND club_id = $2', [teamId, userClubId]);
      if (teamResult.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid team',
          message: 'Team not found or does not belong to your club'
        });
      }
    }

    // For public invites, use a special marker email
    const inviteEmail = isPublic ? `public-${Date.now()}@invite.clubhub` : email;

    // Check if invite already exists for this email and club (only for non-public invites)
    if (!isPublic) {
      const existingInvite = await query(`
        SELECT id, invite_status FROM club_invites 
        WHERE email = $1 AND club_id = $2 AND invite_status = 'pending'
      `, [email, userClubId]);

      if (existingInvite.rows.length > 0) {
        return res.status(409).json({
          error: 'Invite already sent',
          message: 'An active invite already exists for this email'
        });
      }

      // Check if user is already a member
      const existingMember = await query(`
        SELECT id FROM players WHERE email = $1 AND club_id = $2
      `, [email, userClubId]);

      if (existingMember.rows.length > 0) {
        return res.status(409).json({
          error: 'Already a member',
          message: 'This person is already a member of your club'
        });
      }
    }

    // Generate secure invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Create invite record with team assignment
    const inviteResult = await query(`
      INSERT INTO club_invites (
        email, 
        first_name, 
        last_name, 
        club_id, 
        invited_by, 
        club_role, 
        invite_token, 
        expires_at, 
        personal_message,
        team_id,
        is_public,
        invite_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
      RETURNING *
    `, [
      inviteEmail,
      firstName || null,
      lastName || null,
      userClubId,
      req.user.id,
      clubRole,
      inviteToken,
      expiresAt,
      message || null,
      teamId || null,
      isPublic
    ]);

    const invite = inviteResult.rows[0];

    // Generate invite link
    const baseUrl = process.env.BASE_URL || 'https://clubhubsports.net';
    const inviteLink = `${baseUrl}/invite.html?token=${inviteToken}`;

    console.log(`📧 Club invite generated for ${inviteEmail} to join ${club.name}`);
    if (teamId) {
      console.log(`⚽ Invite includes team assignment: ${teamId}`);
    }
    console.log(`🔗 Invite link: ${inviteLink}`);

    res.status(201).json({
      message: 'Club invite generated successfully',
      invite: {
        id: invite.id,
        email: invite.email,
        clubName: club.name,
        clubRole: invite.club_role,
        expiresAt: invite.expires_at,
        inviteLink: inviteLink,
        hasTeamAssignment: !!teamId
      },
      inviteLink: inviteLink
    });

  } catch (error) {
    console.error('Decline invite error:', error);
    res.status(500).json({
      error: 'Failed to decline invite'
    });
  }
});

// 🔥 NEW: GET CLUB'S SENT INVITES
router.get('/sent', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const { status } = req.query;

    // Get user's club
    const clubResult = await query('SELECT id FROM clubs WHERE owner_id = $1', [req.user.id]);
    if (clubResult.rows.length === 0) {
      return res.status(404).json({
        error: 'No club found'
      });
    }

    const clubId = clubResult.rows[0].id;

    let queryText = `
      SELECT ci.*, u.first_name as inviter_first_name, u.last_name as inviter_last_name
      FROM club_invites ci
      JOIN users u ON ci.invited_by = u.id
      WHERE ci.club_id = $1
    `;
    const queryParams = [clubId];

    if (status) {
      queryText += ` AND ci.invite_status = $2`;
      queryParams.push(status);
    }

    queryText += ` ORDER BY ci.created_at DESC`;

    const result = await query(queryText, queryParams);

    res.json({
      invites: result.rows.map(invite => ({
        id: invite.id,
        email: invite.email,
        firstName: invite.first_name,
        lastName: invite.last_name,
        clubRole: invite.club_role,
        inviteStatus: invite.invite_status,
        createdAt: invite.created_at,
        expiresAt: invite.expires_at,
        acceptedAt: invite.accepted_at,
        declinedAt: invite.declined_at,
        personalMessage: invite.personal_message,
        inviter: `${invite.inviter_first_name} ${invite.inviter_last_name}`
      }))
    });

  } catch (error) {
    console.error('Get sent invites error:', error);
    res.status(500).json({
      error: 'Failed to fetch sent invites'
    });
  }
});

// 🔥 NEW: GET USER'S RECEIVED INVITES
router.get('/received', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT ci.*, c.name as club_name, c.description as club_description,
             u.first_name as inviter_first_name, u.last_name as inviter_last_name
      FROM club_invites ci
      JOIN clubs c ON ci.club_id = c.id
      JOIN users u ON ci.invited_by = u.id
      WHERE ci.email = $1
      ORDER BY ci.created_at DESC
    `, [req.user.email]);

    res.json({
      invites: result.rows.map(invite => ({
        id: invite.id,
        clubName: invite.club_name,
        clubDescription: invite.club_description,
        clubRole: invite.club_role,
        inviteStatus: invite.invite_status,
        createdAt: invite.created_at,
        expiresAt: invite.expires_at,
        personalMessage: invite.personal_message,
        inviter: `${invite.inviter_first_name} ${invite.inviter_last_name}`,
        inviteToken: invite.invite_status === 'pending' ? invite.invite_token : null
      }))
    });

  } catch (error) {
    console.error('Get received invites error:', error);
    res.status(500).json({
      error: 'Failed to fetch received invites'
    });
  }
});

// 🔥 NEW: RESEND INVITE
router.post('/resend/:inviteId', authenticateToken, requireOrganization, async (req, res) => {
  try {
    // Get invite details and verify permissions
    const inviteResult = await query(`
      SELECT ci.*, c.owner_id, c.name as club_name
      FROM club_invites ci
      JOIN clubs c ON ci.club_id = c.id
      WHERE ci.id = $1
    `, [req.params.inviteId]);

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Invite not found'
      });
    }

    const invite = inviteResult.rows[0];

    // Check if user owns the club
    if (invite.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Check if invite is still pending
    if (invite.invite_status !== 'pending') {
      return res.status(400).json({
        error: 'Cannot resend',
        message: 'Can only resend pending invites'
      });
    }

    // Generate new token and extend expiry
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update invite
    await query(`
      UPDATE club_invites SET 
        invite_token = $1,
        expires_at = $2,
        updated_at = NOW()
      WHERE id = $3
    `, [newToken, newExpiresAt, req.params.inviteId]);

    // Generate new invite link
    const baseUrl = process.env.BASE_URL || 'https://clubhubsports.net';
    const inviteLink = `${baseUrl}/invite.html?token=${newToken}`;

    console.log(`🔄 Club invite resent: ${invite.email} for ${invite.club_name}`);

    res.json({
      message: 'Invite resent successfully',
      inviteLink: inviteLink
    });

  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({
      error: 'Failed to resend invite'
    });
  }
});

// 🔥 NEW: CANCEL INVITE
router.delete('/:inviteId', authenticateToken, requireOrganization, async (req, res) => {
  try {
    // Get invite details and verify permissions
    const inviteResult = await query(`
      SELECT ci.*, c.owner_id
      FROM club_invites ci
      JOIN clubs c ON ci.club_id = c.id
      WHERE ci.id = $1
    `, [req.params.inviteId]);

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Invite not found'
      });
    }

    const invite = inviteResult.rows[0];

    // Check if user owns the club
    if (invite.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Update invite status to cancelled
    await query(`
      UPDATE club_invites SET 
        invite_status = 'cancelled',
        updated_at = NOW()
      WHERE id = $1
    `, [req.params.inviteId]);

    console.log(`🚫 Club invite cancelled: ${invite.email}`);

    res.json({
      message: 'Invite cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel invite error:', error);
    res.status(500).json({
      error: 'Failed to cancel invite'
    });
  }
});

module.exports = router;('Generate invite error:', error);
    res.status(500).json({
      error: 'Failed to generate invite',
      message: 'An error occurred while generating the invite'
    });

// 🔥 FIXED: GET INVITE DETAILS (PUBLIC)
router.get('/details/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        error: 'Invite token is required'
      });
    }

    // Get invite details with team information
    const inviteResult = await query(`
      SELECT ci.*, c.name as club_name, c.description as club_description, 
             c.location as club_location, c.sport as club_sport,
             u.first_name as inviter_first_name, u.last_name as inviter_last_name,
             t.name as team_name
      FROM club_invites ci
      JOIN clubs c ON ci.club_id = c.id
      JOIN users u ON ci.invited_by = u.id
      LEFT JOIN teams t ON ci.team_id = t.id
      WHERE ci.invite_token = $1
    `, [token]);

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Invite not found',
        message: 'This invite link is invalid or has expired'
      });
    }

    const invite = inviteResult.rows[0];

    // Check if invite has expired
    if (new Date() > new Date(invite.expires_at)) {
      return res.status(410).json({
        error: 'Invite expired',
        message: 'This invite link has expired'
      });
    }

    // Check if invite is still pending
    if (invite.invite_status !== 'pending') {
      return res.status(410).json({
        error: 'Invite no longer valid',
        message: `This invite has been ${invite.invite_status}`
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
        teamName: invite.team_name
      },
      club: {
        name: invite.club_name,
        description: invite.club_description,
        location: invite.club_location,
        sport: invite.club_sport
      },
      inviter: {
        name: `${invite.inviter_first_name} ${invite.inviter_last_name}`
      }
    });

  } catch (error) {
    console.error('Get invite details error:', error);
    res.status(500).json({
      error: 'Failed to fetch invite details'
    });
  }
});

// 🔥 FIXED: ACCEPT CLUB INVITE WITH TEAM ASSIGNMENT
router.post('/accept/:token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.params;
    const { acceptTerms } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Invite token is required'
      });
    }

    if (!acceptTerms) {
      return res.status(400).json({
        error: 'You must accept the terms to join the club'
      });
    }

    // Get invite details with team info
    const inviteResult = await query(`
      SELECT ci.*, c.name as club_name, c.id as club_id, t.name as team_name
      FROM club_invites ci
      JOIN clubs c ON ci.club_id = c.id
      LEFT JOIN teams t ON ci.team_id = t.id
      WHERE ci.invite_token = $1
    `, [token]);

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Invite not found',
        message: 'This invite link is invalid'
      });
    }

    const invite = inviteResult.rows[0];

    // Check if invite has expired
    if (new Date() > new Date(invite.expires_at)) {
      return res.status(410).json({
        error: 'Invite expired',
        message: 'This invite link has expired'
      });
    }

    // Check if invite is still pending
    if (invite.invite_status !== 'pending') {
      return res.status(410).json({
        error: 'Invite no longer valid',
        message: `This invite has been ${invite.invite_status}`
      });
    }

    // Check if user email matches invite email (only for non-public invites)
    if (!invite.is_public && req.user.email !== invite.email) {
      return res.status(403).json({
        error: 'Email mismatch',
        message: 'You must be logged in with the email address that received this invite'
      });
    }

    // Check if user is already a member
    const existingMember = await query(`
      SELECT id FROM players WHERE user_id = $1 AND club_id = $2
    `, [req.user.id, invite.club_id]);

    if (existingMember.rows.length > 0) {
      return res.status(409).json({
        error: 'Already a member',
        message: 'You are already a member of this club'
      });
    }

    // Accept invite in transaction
    const result = await withTransaction(async (client) => {
      // Create player record
      const playerResult = await client.query(`
        INSERT INTO players (
          first_name, 
          last_name, 
          email, 
          user_id, 
          club_id, 
          position, 
          monthly_fee,
          payment_status,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
        RETURNING *
      `, [
        invite.first_name || req.user.first_name || req.user.firstName,
        invite.last_name || req.user.last_name || req.user.lastName,
        req.user.email,
        req.user.id,
        invite.club_id,
        invite.club_role === 'player' ? null : invite.club_role,
        50, // Default monthly fee - can be updated by admin
      ]);

      const newPlayer = playerResult.rows[0];

      // If team was specified in invite, assign player to team
      if (invite.team_id) {
        await client.query(`
          INSERT INTO team_players (team_id, player_id, joined_at)
          VALUES ($1, $2, NOW())
        `, [invite.team_id, newPlayer.id]);
        
        console.log(`⚽ Player assigned to team: ${invite.team_name}`);
      }

      // Update invite status
      await client.query(`
        UPDATE club_invites SET 
          invite_status = 'accepted',
          accepted_at = NOW(),
          accepted_by = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [req.user.id, invite.id]);

      // Create welcome payment if monthly fee > 0
      if (newPlayer.monthly_fee > 0) {
        await client.query(`
          INSERT INTO payments (
            player_id, 
            club_id, 
            amount, 
            payment_type, 
            description, 
            due_date,
            payment_status
          )
          VALUES ($1, $2, $3, 'monthly_fee', $4, $5, 'pending')
        `, [
          newPlayer.id,
          invite.club_id,
          newPlayer.monthly_fee,
          `Welcome payment for ${invite.club_name}`,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        ]);
      }

      return { player: newPlayer, teamAssigned: !!invite.team_id, teamName: invite.team_name };
    });

    console.log(`✅ Club invite accepted: ${req.user.email} joined ${invite.club_name}`);

    res.json({
      message: 'Successfully joined the club!',
      club: {
        name: invite.club_name,
        id: invite.club_id
      },
      player: {
        id: result.player.id,
        name: `${result.player.first_name} ${result.player.last_name}`,
        monthlyFee: result.player.monthly_fee
      },
      team: result.teamAssigned ? {
        assigned: true,
        name: result.teamName
      } : null
    });

  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({
      error: 'Failed to accept invite',
      message: 'An error occurred while accepting the invite'
    });
  }
});

// 🔥 FIXED: DECLINE CLUB INVITE
router.post('/decline/:token', optionalAuth, async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Invite token is required'
      });
    }

    // Get invite details
    const inviteResult = await query(`
      SELECT * FROM club_invites WHERE invite_token = $1
    `, [token]);

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Invite not found'
      });
    }

    const invite = inviteResult.rows[0];

    // Check if invite is still pending
    if (invite.invite_status !== 'pending') {
      return res.status(410).json({
        error: 'Invite no longer valid',
        message: `This invite has been ${invite.invite_status}`
      });
    }

    // Update invite status
    await query(`
      UPDATE club_invites SET 
        invite_status = 'declined',
        declined_at = NOW(),
        decline_reason = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [reason || null, invite.id]);

    console.log(`❌ Club invite declined: ${invite.email} declined to join club ${invite.club_id}`);

    res.json({
      message: 'Invite declined successfully'
    });

  } catch (error) {
    console.error("Error sending invite:", error);
  }})