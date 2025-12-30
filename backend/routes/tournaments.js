const express = require('express');
const { query, withTransaction } = require('../config/database');
const { authenticateToken, requireOrganization } = require('../middleware/auth');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// ================= PUBLIC / TEAMS =================

// Register Team for Tournament
router.post('/register', [
    body('eventId').isUUID(),
    body('teamName').notEmpty(),
    body('contactEmail').isEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { eventId, teamName, contactEmail, contactPhone } = req.body;

        const result = await query(`
            INSERT INTO tournament_teams (event_id, team_name, contact_email, contact_phone, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING *
        `, [eventId, teamName, contactEmail, contactPhone]);

        res.status(201).json({ message: 'Registration successful', team: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// ================= ADMIN =================

// Get Tournament Dashboard
router.get('/:id/dashboard', authenticateToken, requireOrganization, async (req, res) => {
    const eventId = req.params.id;
    try {
        const [teams, stages, matches] = await Promise.all([
            query('SELECT * FROM tournament_teams WHERE event_id = $1 ORDER BY team_name', [eventId]),
            query('SELECT * FROM tournament_stages WHERE event_id = $1 ORDER BY sequence', [eventId]),
            query('SELECT * FROM tournament_matches WHERE event_id = $1 ORDER BY start_time, match_number', [eventId])
        ]);

        res.json({
            teams: teams.rows,
            stages: stages.rows,
            matches: matches.rows
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// Auto-Generate Fixtures (Simple Knockout Generator)
router.post('/:id/generate-fixtures', authenticateToken, requireOrganization, async (req, res) => {
    const eventId = req.params.id;
    const { stageName, type } = req.body; // e.g. type='knockout'

    try {
        await withTransaction(async (client) => {
            // 1. Create Stage
            const stageRes = await client.query(`
                INSERT INTO tournament_stages (event_id, name, type, sequence)
                VALUES ($1, $2, $3, 1) RETURNING id
            `, [eventId, stageName || 'Knockout Stage', type]);
            const stageId = stageRes.rows[0].id;

            // 2. Fetch Approved Teams
            const teamsRes = await client.query(`
                SELECT * FROM tournament_teams WHERE event_id = $1 AND status = 'approved'
            `, [eventId]);
            const teams = teamsRes.rows;

            if (teams.length < 2) throw new Error('Not enough teams');

            if (type === 'knockout') {
                // Simple Single Elimination Generator
                // Needs power of 2 ideally. We'll shuffle and pair.
                // For MVP: randomize and pair up into Round 1 matches. 
                // Then create empty future round matches linking back.
                
                // Shuffle
                for (let i = teams.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [teams[i], teams[j]] = [teams[j], teams[i]];
                }

                // Create Matches
                // Simplification: Just create Round 1. 
                // Full bracket generation requires recursive creation of subsequent empty rounds.
                // Let's do exactly 4 teams -> 2 Semis -> 1 Final for demo simplicity if N=4
                
                // --- PAIR UP ---
                for (let i = 0; i < teams.length; i += 2) {
                    const home = teams[i];
                    const away = teams[i+1]; // might be undefined if odd
                    
                    await client.query(`
                        INSERT INTO tournament_matches (stage_id, event_id, home_team_id, away_team_id, round_number, match_number, status)
                        VALUES ($1, $2, $3, $4, 1, $5, 'scheduled')
                    `, [stageId, eventId, home.id, away ? away.id : null, i/2]);
                }
            } else if (type === 'league') {
                // Round Robin: Every team plays every other team
                for (let i = 0; i < teams.length; i++) {
                    for (let j = i + 1; j < teams.length; j++) {
                         await client.query(`
                            INSERT INTO tournament_matches (stage_id, event_id, home_team_id, away_team_id, status)
                            VALUES ($1, $2, $3, $4, 'scheduled')
                        `, [stageId, eventId, teams[i].id, teams[j].id]);
                    }
                }
            }
        });

        res.json({ message: 'Fixtures generated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Generation failed: ' + err.message });
    }
});

// Update Match Result
router.post('/matches/:id/result', authenticateToken, requireOrganization, async (req, res) => {
    const { homeScore, awayScore } = req.body;
    try {
        await withTransaction(async (client) => {
             // 1. Update Score
             const matchRes = await client.query(`
                UPDATE tournament_matches 
                SET home_score = $1, away_score = $2, status = 'completed', updated_at = NOW()
                WHERE id = $3
                RETURNING *
             `, [homeScore, awayScore, req.params.id]);
             const match = matchRes.rows[0];

             // 2. Bracket Progression
             if (match.next_match_id) {
                 const winnerId = (homeScore > awayScore) ? match.home_team_id : match.away_team_id;
                 if (winnerId) {
                     const field = match.progress_to_home ? 'home_team_id' : 'away_team_id';
                     await client.query(`
                        UPDATE tournament_matches SET ${field} = $1 WHERE id = $2
                     `, [winnerId, match.next_match_id]);
                 }
             }
        });
        res.json({ message: 'Match updated' });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// Update Team Status (Check-In)
router.post('/teams/:id/status', authenticateToken, requireOrganization, async (req, res) => {
    const { status } = req.body;
    try {
        await query('UPDATE tournament_teams SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
