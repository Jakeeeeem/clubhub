const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireOrganization } = require('../middleware/auth');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Create a poll
router.post('/', authenticateToken, requireOrganization, [
    body('title').notEmpty(),
    body('options').isArray({ min: 2 }),
    body('clubId').optional().isUUID()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { title, description, options, clubId, expiresAt, organizationId } = req.body;
        
        const result = await query(`
            INSERT INTO polls (organization_id, club_id, title, description, options, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [organizationId, clubId, title, description, JSON.stringify(options), expiresAt]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create poll' });
    }
});

// Get polls for an organization/club
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { organizationId, clubId } = req.query;
        let q = 'SELECT * FROM polls WHERE organization_id = $1';
        let params = [organizationId];

        if (clubId) {
            q += ' AND club_id = $2';
            params.push(clubId);
        }

        q += ' ORDER BY created_at DESC';
        const result = await query(q, params);

        // For each poll, get vote counts
        const pollsWithVotes = await Promise.all(result.rows.map(async (poll) => {
            const votes = await query(`
                SELECT selection, COUNT(*) as count 
                FROM poll_votes 
                WHERE poll_id = $1 
                GROUP BY selection
            `, [poll.id]);
            
            // Check if user has voted
            const userVote = await query('SELECT selection FROM poll_votes WHERE poll_id = $1 AND user_id = $2', [poll.id, req.user.id]);
            
            return {
                ...poll,
                results: votes.rows,
                userVote: userVote.rows.length > 0 ? userVote.rows[0].selection : null
            };
        }));

        res.json(pollsWithVotes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch polls' });
    }
});

// Vote in a poll
router.post('/:id/vote', authenticateToken, [
    body('selection').notEmpty()
], async (req, res) => {
    try {
        const pollId = req.params.id;
        const { selection } = req.body;
        const userId = req.user.id;

        // Check if poll is active and not expired
        const poll = await query('SELECT * FROM polls WHERE id = $1', [pollId]);
        if (poll.rows.length === 0) return res.status(404).json({ error: 'Poll not found' });
        
        if (poll.rows[0].status !== 'active') return res.status(400).json({ error: 'Poll is closed' });
        if (poll.rows[0].expires_at && new Date(poll.rows[0].expires_at) < new Date()) {
             return res.status(400).json({ error: 'Poll has expired' });
        }

        // Upsert vote
        await query(`
            INSERT INTO poll_votes (poll_id, user_id, selection)
            VALUES ($1, $2, $3)
            ON CONFLICT (poll_id, user_id) DO UPDATE SET selection = $3, created_at = NOW()
        `, [pollId, userId, selection]);

        res.json({ message: 'Vote recorded' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to record vote' });
    }
});

module.exports = router;
