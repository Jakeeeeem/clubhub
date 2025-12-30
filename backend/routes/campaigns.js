const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, requireOrganization } = require('../middleware/auth');
const emailService = require('../services/email-service');
const { body, validationResult } = require('express-validator');

/**
 * @route GET /api/campaigns
 * @desc Get all campaigns for a club
 */
router.get('/', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const clubId = req.query.clubId;
    if (!clubId) {
      return res.status(400).json({ error: 'clubId is required' });
    }

    const result = await query(
      'SELECT * FROM campaigns WHERE club_id = $1 ORDER BY created_at DESC',
      [clubId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

/**
 * @route POST /api/campaigns
 * @desc Create a new marketing campaign
 */
router.post('/', authenticateToken, requireOrganization, [
  body('name').notEmpty().trim(),
  body('subject').notEmpty().trim(),
  body('content').notEmpty(),
  body('clubId').isUUID()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, subject, content, target_group, target_team_id, clubId } = req.body;

    const result = await query(
      `INSERT INTO campaigns (name, subject, content, target_group, target_team_id, club_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'draft') RETURNING *`,
      [name, subject, content, target_group || 'all', target_team_id, clubId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating campaign:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

/**
 * @route POST /api/campaigns/:id/send
 * @desc Send a campaign email to recipients
 */
router.post('/:id/send', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const campaignId = req.params.id;
    
    // 1. Fetch campaign
    const campaignResult = await query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const campaign = campaignResult.rows[0];

    // 2. Identify recipients
    let recipientsResult;
    if (campaign.target_group === 'players') {
      recipientsResult = await query('SELECT email FROM players WHERE club_id = $1 AND email IS NOT NULL', [campaign.club_id]);
    } else if (campaign.target_group === 'staff') {
      recipientsResult = await query('SELECT email FROM staff WHERE club_id = $1 AND email IS NOT NULL', [campaign.club_id]);
    } else if (campaign.target_group === 'specific_team' && campaign.target_team_id) {
       recipientsResult = await query(`
        SELECT p.email FROM players p
        JOIN team_players tp ON p.id = tp.player_id
        WHERE tp.team_id = $1 AND p.email IS NOT NULL
      `, [campaign.target_team_id]);
    } else {
      // 'all' - players and staff
      recipientsResult = await query(`
        SELECT email FROM players WHERE club_id = $1 AND email IS NOT NULL
        UNION
        SELECT email FROM staff WHERE club_id = $1 AND email IS NOT NULL
      `, [campaign.club_id]);
    }

    const recipients = recipientsResult.rows.map(r => r.email);
    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients found for this target group' });
    }

    // 3. Send emails
    // In a real production app, this would be queued/proccessed in batches
    for (const email of recipients) {
      try {
        await emailService.sendEmail({
          to: email,
          subject: campaign.subject,
          html: campaign.content,
          text: campaign.content.replace(/<[^>]*>?/gm, '') // Crude HTML to text
        });
      } catch (err) {
        console.warn(`Failed to send campaign email to ${email}:`, err.message);
      }
    }

    // 4. Update campaign status
    await query(
      'UPDATE campaigns SET status = $1, sent_at = NOW() WHERE id = $2',
      ['sent', campaignId]
    );

    res.json({ message: `Campaign sent to ${recipients.length} recipients` });
  } catch (err) {
    console.error('Error sending campaign:', err);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

module.exports = router;
