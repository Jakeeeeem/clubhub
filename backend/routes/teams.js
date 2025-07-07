const express = require('express');
const { query, queries, withTransaction } = require('../config/database');
const { authenticateToken, requireOrganization } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation rules
const teamValidation = [
  body('name').trim().isLength({ min: 1 }).withMessage('Team name is required'),
  body('ageGroup').optional().trim(),
  body('sport').trim().isLength({ min: 1 }).withMessage('Sport is required'),
  body('description').optional().trim(),
  body('coachId').optional().isUUID().withMessage('Valid coach ID required'),
  body('clubId').isUUID().withMessage('Valid club ID is required')
];

// Get all teams (with optional club filter)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { clubId, sport, ageGroup } = req.query;
    
    let queryText = `
      SELECT t.*, 
             s.first_name as coach_first_name,
             s.last_name as coach_last_name,
             COUNT(tp.player_id) as player_count
      FROM teams t
      LEFT JOIN staff s ON t.coach_id = s.id
      LEFT JOIN team_players tp ON t.id = tp.team_id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Filter by club if provided
    if (clubId) {
      paramCount++;
      queryText += ` AND t.club_id = $${paramCount}`;
      queryParams.push(clubId);
    }

    // Filter by sport if provided
    if (sport) {
      paramCount++;
      queryText += ` AND t.sport ILIKE $${paramCount}`;
      queryParams.push(`%${sport}%`);
    }

    // Filter by age group if provided
    if (ageGroup) {
      paramCount++;
      queryText += ` AND t.age_group ILIKE $${paramCount}`;
      queryParams.push(`%${ageGroup}%`);
    }

    queryText += ` 
      GROUP BY t.id, s.first_name, s.last_name
      ORDER BY t.created_at DESC
    `;

    const result = await query(queryText, queryParams);
    
    // Calculate win percentage for each team
    const teamsWithStats = result.rows.map(team => ({
      ...team,
      total_games: team.wins + team.losses + team.draws,
      win_percentage: team.wins + team.losses + team.draws > 0 
        ? Math.round((team.wins / (team.wins + team.losses + team.draws)) * 100)
        : 0
    }));

    res.json(teamsWithStats);

  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      error: 'Failed to fetch teams',
      message: 'An error occurred while fetching teams'
    });
  }
});

// Get specific team
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const teamResult = await query(`
      SELECT t.*, 
             s.first_name as coach_first_name,
             s.last_name as coach_last_name,
             s.email as coach_email,
             c.name as club_name
      FROM teams t
      LEFT JOIN staff s ON t.coach_id = s.id
      LEFT JOIN clubs c ON t.club_id = c.id
      WHERE t.id = $1
    `, [req.params.id]);
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Team not found',
        message: 'Team with this ID does not exist'
      });
    }

    const team = teamResult.rows[0];

    // Get team players
    const playersResult = await query(`
      SELECT p.*, tp.position as team_position, tp.jersey_number
      FROM players p
      JOIN team_players tp ON p.id = tp.player_id
      WHERE tp.team_id = $1
      ORDER BY tp.jersey_number ASC, p.last_name ASC
    `, [req.params.id]);

    team.players = playersResult.rows;

    // Get recent matches
    const matchesResult = await query(`
      SELECT e.*, mr.home_score, mr.away_score, mr.result, mr.match_notes
      FROM events e
      LEFT JOIN match_results mr ON e.id = mr.event_id
      WHERE e.team_id = $1 AND e.event_type = 'match'
      ORDER BY e.event_date DESC
      LIMIT 10
    `, [req.params.id]);

    team.recent_matches = matchesResult.rows;

    // Get upcoming events
    const upcomingEventsResult = await query(`
      SELECT * FROM events
      WHERE team_id = $1 AND event_date >= CURRENT_DATE
      ORDER BY event_date ASC
      LIMIT 5
    `, [req.params.id]);

    team.upcoming_events = upcomingEventsResult.rows;

    // Calculate team statistics
    team.total_games = team.wins + team.losses + team.draws;
    team.win_percentage = team.total_games > 0 
      ? Math.round((team.wins / team.total_games) * 100)
      : 0;

    res.json(team);

  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      error: 'Failed to fetch team',
      message: 'An error occurred while fetching team details'
    });
  }
});

// Create new team
router.post('/', authenticateToken, requireOrganization, teamValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { 
      name, 
      ageGroup, 
      sport, 
      description, 
      coachId,
      clubId
    } = req.body;

    // Verify club exists and user owns it
    const clubResult = await query(queries.findClubById, [clubId]);
    if (clubResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Club not found',
        message: 'The specified club does not exist'
      });
    }

    const club = clubResult.rows[0];
    if (club.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only create teams for your own clubs'
      });
    }

    // Verify coach exists and belongs to the club (if provided)
    if (coachId) {
      const coachResult = await query(`
        SELECT * FROM staff 
        WHERE id = $1 AND club_id = $2 AND role IN ('coach', 'assistant-coach', 'coaching-supervisor')
      `, [coachId, clubId]);
      
      if (coachResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Coach not found',
          message: 'The specified coach does not exist in this club'
        });
      }
    }

    // Check if team name already exists in this club
    const existingTeam = await query(
      'SELECT id FROM teams WHERE name = $1 AND club_id = $2',
      [name, clubId]
    );
    
    if (existingTeam.rows.length > 0) {
      return res.status(409).json({
        error: 'Team already exists',
        message: 'A team with this name already exists in this club'
      });
    }

    const result = await query(`
      INSERT INTO teams (name, age_group, sport, description, coach_id, club_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      name,
      ageGroup || null,
      sport,
      description || null,
      coachId || null,
      clubId
    ]);

    const newTeam = result.rows[0];

    res.status(201).json({
      message: 'Team created successfully',
      team: newTeam
    });

  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      error: 'Failed to create team',
      message: 'An error occurred while creating the team'
    });
  }
});

// Update team
router.put('/:id', authenticateToken, requireOrganization, teamValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if team exists and user has permission
    const teamResult = await query(`
      SELECT t.*, c.owner_id 
      FROM teams t
      JOIN clubs c ON t.club_id = c.id
      WHERE t.id = $1
    `, [req.params.id]);
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Team not found',
        message: 'Team with this ID does not exist'
      });
    }

    const team = teamResult.rows[0];
    
    if (team.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update teams in your own clubs'
      });
    }

    const { 
      name, 
      ageGroup, 
      sport, 
      description, 
      coachId
    } = req.body;

    // Verify coach exists and belongs to the club (if provided)
    if (coachId) {
      const coachResult = await query(`
        SELECT * FROM staff 
        WHERE id = $1 AND club_id = $2 AND role IN ('coach', 'assistant-coach', 'coaching-supervisor')
      `, [coachId, team.club_id]);
      
      if (coachResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Coach not found',
          message: 'The specified coach does not exist in this club'
        });
      }
    }

    const result = await query(`
      UPDATE teams SET 
        name = $1,
        age_group = $2,
        sport = $3,
        description = $4,
        coach_id = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [
      name,
      ageGroup || null,
      sport,
      description || null,
      coachId || null,
      req.params.id
    ]);

    const updatedTeam = result.rows[0];

    res.json({
      message: 'Team updated successfully',
      team: updatedTeam
    });

  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      error: 'Failed to update team',
      message: 'An error occurred while updating the team'
    });
  }
});

// Delete team
router.delete('/:id', authenticateToken, requireOrganization, async (req, res) => {
  try {
    // Check if team exists and user has permission
    const teamResult = await query(`
      SELECT t.*, c.owner_id 
      FROM teams t
      JOIN clubs c ON t.club_id = c.id
      WHERE t.id = $1
    `, [req.params.id]);
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Team not found',
        message: 'Team with this ID does not exist'
      });
    }

    const team = teamResult.rows[0];
    
    if (team.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete teams from your own clubs'
      });
    }

    // Delete team and related data in transaction
    await withTransaction(async (client) => {
      // Delete team players associations
      await client.query('DELETE FROM team_players WHERE team_id = $1', [req.params.id]);
      
      // Update events to remove team association
      await client.query('UPDATE events SET team_id = NULL WHERE team_id = $1', [req.params.id]);
      
      // Delete team
      await client.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    });

    res.json({
      message: 'Team deleted successfully'
    });

  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      error: 'Failed to delete team',
      message: 'An error occurred while deleting the team'
    });
  }
});

// Add player to team
router.post('/:id/players', authenticateToken, requireOrganization, [
  body('playerId').isUUID().withMessage('Valid player ID is required'),
  body('position').optional().trim(),
  body('jerseyNumber').optional().isInt({ min: 1, max: 99 }).withMessage('Jersey number must be between 1 and 99')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { playerId, position, jerseyNumber } = req.body;

    // Verify team exists and user has permission
    const teamResult = await query(`
      SELECT t.*, c.owner_id 
      FROM teams t
      JOIN clubs c ON t.club_id = c.id
      WHERE t.id = $1
    `, [req.params.id]);
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Team not found'
      });
    }

    const team = teamResult.rows[0];
    
    if (team.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Verify player exists and belongs to the same club
    const playerResult = await query(`
      SELECT * FROM players 
      WHERE id = $1 AND club_id = $2
    `, [playerId, team.club_id]);
    
    if (playerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'Player does not exist in this club'
      });
    }

    // Check if player is already in the team
    const existingAssignment = await query(
      'SELECT id FROM team_players WHERE team_id = $1 AND player_id = $2',
      [req.params.id, playerId]
    );
    
    if (existingAssignment.rows.length > 0) {
      return res.status(409).json({
        error: 'Player already in team',
        message: 'This player is already assigned to this team'
      });
    }

    // Check if jersey number is already taken
    if (jerseyNumber) {
      const existingJersey = await query(
        'SELECT id FROM team_players WHERE team_id = $1 AND jersey_number = $2',
        [req.params.id, jerseyNumber]
      );
      
      if (existingJersey.rows.length > 0) {
        return res.status(409).json({
          error: 'Jersey number taken',
          message: 'This jersey number is already assigned to another player'
        });
      }
    }

    // Add player to team
    const result = await query(`
      INSERT INTO team_players (team_id, player_id, position, jersey_number)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.params.id, playerId, position || null, jerseyNumber || null]);

    res.status(201).json({
      message: 'Player added to team successfully',
      assignment: result.rows[0]
    });

  } catch (error) {
    console.error('Add player to team error:', error);
    res.status(500).json({
      error: 'Failed to add player to team'
    });
  }
});

// Remove player from team
router.delete('/:id/players/:playerId', authenticateToken, requireOrganization, async (req, res) => {
  try {
    // Verify team exists and user has permission
    const teamResult = await query(`
      SELECT t.*, c.owner_id 
      FROM teams t
      JOIN clubs c ON t.club_id = c.id
      WHERE t.id = $1
    `, [req.params.id]);
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Team not found'
      });
    }

    const team = teamResult.rows[0];
    
    if (team.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Remove player from team
    const result = await query(
      'DELETE FROM team_players WHERE team_id = $1 AND player_id = $2',
      [req.params.id, req.params.playerId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Player not found in team',
        message: 'This player is not assigned to this team'
      });
    }

    res.json({
      message: 'Player removed from team successfully'
    });

  } catch (error) {
    console.error('Remove player from team error:', error);
    res.status(500).json({
      error: 'Failed to remove player from team'
    });
  }
});

// Get team statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const teamId = req.params.id;

    // Get basic team info
    const teamResult = await query(`
      SELECT t.*, COUNT(tp.player_id) as player_count
      FROM teams t
      LEFT JOIN team_players tp ON t.id = tp.team_id
      WHERE t.id = $1
      GROUP BY t.id
    `, [teamId]);

    if (teamResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Team not found'
      });
    }

    const team = teamResult.rows[0];

    // Get match statistics
    const matchStats = await query(`
      SELECT 
        COUNT(*) as total_matches,
        AVG(CASE WHEN mr.result = 'win' THEN mr.home_score ELSE mr.away_score END) as avg_goals_scored,
        AVG(CASE WHEN mr.result = 'win' THEN mr.away_score ELSE mr.home_score END) as avg_goals_conceded
      FROM events e
      JOIN match_results mr ON e.id = mr.event_id
      WHERE e.team_id = $1 AND e.event_type = 'match'
    `, [teamId]);

    // Get player performance stats
    const playerStats = await query(`
      SELECT 
        p.first_name,
        p.last_name,
        tp.position,
        COUNT(pr.id) as matches_played,
        AVG(pr.rating) as average_rating
      FROM players p
      JOIN team_players tp ON p.id = tp.player_id
      LEFT JOIN player_ratings pr ON p.id = pr.player_id
      WHERE tp.team_id = $1
      GROUP BY p.id, p.first_name, p.last_name, tp.position
      ORDER BY average_rating DESC NULLS LAST
    `, [teamId]);

    // Get recent form (last 5 matches)
    const recentForm = await query(`
      SELECT mr.result, e.event_date, e.opponent
      FROM events e
      JOIN match_results mr ON e.id = mr.event_id
      WHERE e.team_id = $1 AND e.event_type = 'match'
      ORDER BY e.event_date DESC
      LIMIT 5
    `, [teamId]);

    const stats = {
      team,
      matches: matchStats.rows[0] || {},
      players: playerStats.rows,
      recent_form: recentForm.rows,
      performance: {
        total_games: team.wins + team.losses + team.draws,
        win_percentage: team.wins + team.losses + team.draws > 0 
          ? Math.round((team.wins / (team.wins + team.losses + team.draws)) * 100)
          : 0,
        points: team.wins * 3 + team.draws * 1 // Football scoring system
      }
    };

    res.json(stats);

  } catch (error) {
    console.error('Get team stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch team statistics'
    });
  }
});

module.exports = router;