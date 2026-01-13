const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireOrganization } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// GET /api/leagues - List all leagues
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { organizationId } = req.query;
        
        let queryText = `
            SELECT l.*, o.name as organization_name,
                   (SELECT COUNT(*) FROM league_teams WHERE league_id = l.id) as team_count,
                   (SELECT COUNT(*) FROM fixtures WHERE league_id = l.id) as fixture_count
            FROM leagues l
            LEFT JOIN organizations o ON l.organization_id = o.id
            WHERE l.is_active = true
        `;
        const params = [];
        
        if (organizationId) {
            queryText += ` AND l.organization_id = $1`;
            params.push(organizationId);
        }
        
        queryText += ' ORDER BY l.created_at DESC';
        
        const result = await query(queryText, params);
        res.json(result.rows);
        
    } catch (error) {
        console.error('Get leagues error:', error);
        res.status(500).json({ error: 'Failed to fetch leagues' });
    }
});

// POST /api/leagues - Create league
router.post('/', authenticateToken, requireOrganization, [
    body('name').trim().notEmpty(),
    body('organizationId').isUUID()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { name, season, sport, description, startDate, endDate, organizationId } = req.body;
        
        const result = await query(`
            INSERT INTO leagues (name, season, sport, description, start_date, end_date, organization_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [name, season, sport, description, startDate, endDate, organizationId]);
        
        res.status(201).json(result.rows[0]);
        
    } catch (error) {
        console.error('Create league error:', error);
        res.status(500).json({ error: 'Failed to create league' });
    }
});

// GET /api/leagues/:id - Get league details
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT l.*, o.name as organization_name
            FROM leagues l
            LEFT JOIN organizations o ON l.organization_id = o.id
            WHERE l.id = $1
        `, [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'League not found' });
        }
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Get league error:', error);
        res.status(500).json({ error: 'Failed to fetch league' });
    }
});

// GET /api/leagues/:id/standings - Get league standings
router.get('/:id/standings', authenticateToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT lt.*, t.name as team_name,
                   (lt.goals_for - lt.goals_against) as goal_difference
            FROM league_teams lt
            JOIN teams t ON lt.team_id = t.id
            WHERE lt.league_id = $1
            ORDER BY lt.points DESC, goal_difference DESC, lt.goals_for DESC
        `, [req.params.id]);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Get standings error:', error);
        res.status(500).json({ error: 'Failed to fetch standings' });
    }
});

// POST /api/leagues/:id/teams - Add team to league
router.post('/:id/teams', authenticateToken, requireOrganization, async (req, res) => {
    try {
        const { id } = req.params;
        const { teamId } = req.body;
        
        const result = await query(`
            INSERT INTO league_teams (league_id, team_id)
            VALUES ($1, $2)
            RETURNING *
        `, [id, teamId]);
        
        res.status(201).json(result.rows[0]);
        
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Team already in league' });
        }
        console.error('Add team to league error:', error);
        res.status(500).json({ error: 'Failed to add team to league' });
    }
});

// POST /api/leagues/:id/fixtures/generate - Auto-generate fixtures
router.post('/:id/fixtures/generate', authenticateToken, requireOrganization, async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, matchesPerWeek } = req.body;
        
        // Get all teams in the league
        const teamsResult = await query(`
            SELECT team_id FROM league_teams WHERE league_id = $1
        `, [id]);
        
        const teams = teamsResult.rows.map(r => r.team_id);
        
        if (teams.length < 2) {
            return res.status(400).json({ error: 'Need at least 2 teams to generate fixtures' });
        }
        
        // Simple round-robin algorithm
        const fixtures = [];
        let matchWeek = 1;
        
        // Each team plays each other team once (home and away)
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                // Home fixture
                fixtures.push({
                    league_id: id,
                    home_team_id: teams[i],
                    away_team_id: teams[j],
                    match_week: matchWeek
                });
                
                // Away fixture
                fixtures.push({
                    league_id: id,
                    home_team_id: teams[j],
                    away_team_id: teams[i],
                    match_week: matchWeek + Math.floor(teams.length / 2)
                });
                
                matchWeek++;
                if (matchWeek > teams.length - 1) matchWeek = 1;
            }
        }
        
        // Insert fixtures
        for (const fixture of fixtures) {
            await query(`
                INSERT INTO fixtures (league_id, home_team_id, away_team_id, match_week)
                VALUES ($1, $2, $3, $4)
            `, [fixture.league_id, fixture.home_team_id, fixture.away_team_id, fixture.match_week]);
        }
        
        res.json({
            message: 'Fixtures generated successfully',
            count: fixtures.length
        });
        
    } catch (error) {
        console.error('Generate fixtures error:', error);
        res.status(500).json({ error: 'Failed to generate fixtures' });
    }
});

// GET /api/leagues/:id/fixtures - Get league fixtures
router.get('/:id/fixtures', authenticateToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT f.*,
                   ht.name as home_team_name,
                   at.name as away_team_name,
                   u.first_name || ' ' || u.last_name as referee_name
            FROM fixtures f
            JOIN teams ht ON f.home_team_id = ht.id
            JOIN teams at ON f.away_team_id = at.id
            LEFT JOIN users u ON f.referee_id = u.id
            WHERE f.league_id = $1
            ORDER BY f.match_week, f.scheduled_time
        `, [req.params.id]);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Get fixtures error:', error);
        res.status(500).json({ error: 'Failed to fetch fixtures' });
    }
});

// PUT /api/leagues/fixtures/:id/score - Update match score
router.put('/fixtures/:id/score', authenticateToken, requireOrganization, async (req, res) => {
    try {
        const { id } = req.params;
        const { homeScore, awayScore } = req.body;
        
        // Update fixture
        const fixtureResult = await query(`
            UPDATE fixtures
            SET home_score = $1, away_score = $2, status = 'completed', updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `, [homeScore, awayScore, id]);
        
        if (fixtureResult.rows.length === 0) {
            return res.status(404).json({ error: 'Fixture not found' });
        }
        
        const fixture = fixtureResult.rows[0];
        
        // Update league standings
        const homeWin = homeScore > awayScore;
        const draw = homeScore === awayScore;
        const awayWin = awayScore > homeScore;
        
        // Update home team
        await query(`
            UPDATE league_teams
            SET points = points + $1,
                wins = wins + $2,
                draws = draws + $3,
                losses = losses + $4,
                goals_for = goals_for + $5,
                goals_against = goals_against + $6
            WHERE league_id = $7 AND team_id = $8
        `, [
            homeWin ? 3 : (draw ? 1 : 0),
            homeWin ? 1 : 0,
            draw ? 1 : 0,
            awayWin ? 1 : 0,
            homeScore,
            awayScore,
            fixture.league_id,
            fixture.home_team_id
        ]);
        
        // Update away team
        await query(`
            UPDATE league_teams
            SET points = points + $1,
                wins = wins + $2,
                draws = draws + $3,
                losses = losses + $4,
                goals_for = goals_for + $5,
                goals_against = goals_against + $6
            WHERE league_id = $7 AND team_id = $8
        `, [
            awayWin ? 3 : (draw ? 1 : 0),
            awayWin ? 1 : 0,
            draw ? 1 : 0,
            homeWin ? 1 : 0,
            awayScore,
            homeScore,
            fixture.league_id,
            fixture.away_team_id
        ]);
        
        res.json({
            message: 'Score updated and standings recalculated',
            fixture: fixtureResult.rows[0]
        });
        
    } catch (error) {
        console.error('Update score error:', error);
        res.status(500).json({ error: 'Failed to update score' });
    }
});

// POST /api/leagues/fixtures/:id/assign-referee - Assign referee to fixture
router.post('/fixtures/:id/assign-referee', authenticateToken, requireOrganization, async (req, res) => {
    try {
        const { id } = req.params;
        const { refereeId } = req.body;
        
        const result = await query(`
            UPDATE fixtures
            SET referee_id = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `, [refereeId, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Fixture not found' });
        }
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Assign referee error:', error);
        res.status(500).json({ error: 'Failed to assign referee' });
    }
});

module.exports = router;
