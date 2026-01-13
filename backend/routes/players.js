const express = require('express');
const { query, queries, withTransaction } = require('../config/database');
const { authenticateToken, requireOrganization } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation rules
const playerValidation = [
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').optional().trim(),
  body('dateOfBirth').isISO8601().withMessage('Please provide a valid date of birth'),
  body('position').optional().trim(),
  body('clubId').isUUID().withMessage('Valid club ID is required'),
  body('monthlyFee').optional().isNumeric().withMessage('Monthly fee must be a number')
];

// GET /api/players/family - Get family members for logged-in user
router.get('/family', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM players WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    const playersWithAge = result.rows.map(player => ({
      ...player,
      age: calculateAge(player.date_of_birth)
    }));

    res.json(playersWithAge);
  } catch (error) {
    console.error('Get family error:', error);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

// Get all players (with optional filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { clubId, search, position, sport, location, minAge, maxAge } = req.query;
    
    let queryText = `
        SELECT p.*, 
        EXTRACT(YEAR FROM age(CURRENT_DATE, p.date_of_birth)) as age 
        FROM players p 
        WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (clubId) {
      paramCount++;
      queryText += ` AND p.club_id = $${paramCount}`;
      queryParams.push(clubId);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (p.first_name ILIKE $${paramCount} OR p.last_name ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (position) {
      paramCount++;
      queryText += ` AND p.position ILIKE $${paramCount}`;
      queryParams.push(`%${position}%`);
    }

    if (sport) {
        paramCount++;
        queryText += ` AND p.sport ILIKE $${paramCount}`;
        queryParams.push(`%${sport}%`);
    }

    if (location) {
        paramCount++;
        queryText += ` AND p.location ILIKE $${paramCount}`;
        queryParams.push(`%${location}%`);
    }

    if (minAge) {
        paramCount++;
        queryText += ` AND EXTRACT(YEAR FROM age(CURRENT_DATE, p.date_of_birth)) >= $${paramCount}`;
        queryParams.push(parseInt(minAge));
    }

    if (maxAge) {
        paramCount++;
        queryText += ` AND EXTRACT(YEAR FROM age(CURRENT_DATE, p.date_of_birth)) <= $${paramCount}`;
        queryParams.push(parseInt(maxAge));
    }

    queryText += ' ORDER BY p.created_at DESC';

    const result = await query(queryText, queryParams);
    res.json(result.rows);

  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({
      error: 'Failed to fetch players',
      message: 'An error occurred while fetching players'
    });
  }
});

// GET /api/players/filtered/:filter - Advanced filtering
router.get('/filtered/:filter', authenticateToken, async (req, res) => {
    try {
        const { filter } = req.params;
        const { clubId } = req.query;
        
        let queryText = 'SELECT p.* FROM players p WHERE 1=1';
        const queryParams = [];
        let paramCount = 0;

        if (clubId) {
            paramCount++;
            queryText += ` AND p.club_id = $${paramCount}`;
            queryParams.push(clubId);
        }

        switch (filter) {
            case 'on-plan':
                // Players with an active payment plan (requires linked user account)
                queryText += ` AND p.user_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM player_plans pp 
                    WHERE pp.user_id = p.user_id AND pp.is_active = true
                )`;
                break;
            case 'not-on-plan':
                // Players without an active payment plan
                queryText += ` AND (p.user_id IS NULL OR NOT EXISTS (
                    SELECT 1 FROM player_plans pp 
                    WHERE pp.user_id = p.user_id AND pp.is_active = true
                ))`;
                break;
            case 'assigned':
                // Players assigned to at least one team
                queryText += ` AND EXISTS (
                    SELECT 1 FROM team_players tp 
                    WHERE tp.player_id = p.id
                )`;
                break;
            case 'not-assigned':
                // Players not assigned to any team
                queryText += ` AND NOT EXISTS (
                    SELECT 1 FROM team_players tp 
                    WHERE tp.player_id = p.id
                )`;
                break;
            case 'overdue':
                // Players with overdue payment status
                queryText += ` AND p.payment_status = 'overdue'`;
                break;
            default:
                // No extra filter
                break;
        }

        queryText += ' ORDER BY p.created_at DESC';

        const result = await query(queryText, queryParams);
        
        const playersWithAge = result.rows.map(player => ({
            ...player,
            age: calculateAge(player.date_of_birth)
        }));

        res.json(playersWithAge);

    } catch (error) {
        console.error('Get filtered players error:', error);
        res.status(500).json({ error: 'Failed to fetch filtered players' });
    }
});

// GET /api/players/scout - Fetch players for the scouting dashboard
router.get('/scout', async (req, res) => {
  try {
    const { position, minAge, maxAge, sport } = req.query;
    
    let queryText = `
      SELECT p.id, p.first_name, p.last_name, p.position, p.attendance_rate, p.date_of_birth,
             c.name as club_name, c.sport
      FROM players p
      LEFT JOIN clubs c ON p.club_id = c.id
      WHERE p.scouting_opt_in = true
    `;
    const queryParams = [];
    let paramCount = 0;

    if (position) {
      paramCount++;
      queryText += ` AND p.position ILIKE $${paramCount}`;
      queryParams.push(`%${position}%`);
    }

    if (sport) {
      paramCount++;
      queryText += ` AND c.sport ILIKE $${paramCount}`;
      queryParams.push(`%${sport}%`);
    }

    const result = await query(queryText, queryParams);
    
    const scouts = result.rows.map(player => {
      const age = calculateAge(player.date_of_birth);
      return { ...player, age };
    }).filter(player => {
      if (minAge && player.age < parseInt(minAge)) return false;
      if (maxAge && player.age > parseInt(maxAge)) return false;
      return true;
    });

    res.json(scouts);
  } catch (error) {
    console.error('Scouting error:', error);
    res.status(500).json({ error: 'Failed to fetch scouting data' });
  }
});

// Get specific player
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(queries.findPlayerById, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'Player with this ID does not exist'
      });
    }

    const player = result.rows[0];
    
    // Add calculated fields
    player.age = calculateAge(player.date_of_birth);

    // Get player's teams
    const teamsResult = await query(`
      SELECT t.*, tp.position as team_position, tp.jersey_number
      FROM teams t
      JOIN team_players tp ON t.id = tp.team_id
      WHERE tp.player_id = $1
    `, [req.params.id]);

    player.teams = teamsResult.rows;

    // Get recent payments
    const paymentsResult = await query(`
      SELECT * FROM payments 
      WHERE player_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [req.params.id]);

    player.recent_payments = paymentsResult.rows;

    res.json(player);

  } catch (error) {
    console.error('Get player error:', error);
    res.status(500).json({
      error: 'Failed to fetch player',
      message: 'An error occurred while fetching player details'
    });
  }
});

router.get('/filtered/:filter', authenticateToken, async (req, res) => {
  try {
    const { filter } = req.params;
    const { clubId } = req.query;
    
    let queryText = `
      SELECT p.*, 
             CASE WHEN pp.plan_id IS NOT NULL THEN true ELSE false END as has_payment_plan,
             CASE WHEN tp.team_id IS NOT NULL THEN true ELSE false END as has_team_assignment,
             pay.overdue_count,
             t.name as team_name
      FROM players p
      LEFT JOIN player_plans pp ON pp.user_id = p.user_id AND pp.is_active = true
      LEFT JOIN team_players tp ON tp.player_id = p.id  
      LEFT JOIN teams t ON t.id = tp.team_id
      LEFT JOIN (
        SELECT player_id, COUNT(*) as overdue_count 
        FROM payments 
        WHERE payment_status = 'overdue' 
        GROUP BY player_id
      ) pay ON pay.player_id = p.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    if (clubId) {
      paramCount++;
      queryText += ` AND p.club_id = $${paramCount}`;
      queryParams.push(clubId);
    }

    switch(filter) {
      case 'on-plan':
        queryText += ` AND pp.plan_id IS NOT NULL`;
        break;
      case 'not-on-plan':
        queryText += ` AND pp.plan_id IS NULL`;
        break;
      case 'not-assigned':
        queryText += ` AND tp.team_id IS NULL`;
        break;
      case 'assigned':
        queryText += ` AND tp.team_id IS NOT NULL`;
        break;
      case 'overdue':
        queryText += ` AND pay.overdue_count > 0`;
        break;
    }

    queryText += ` ORDER BY p.created_at DESC`;
    
    const result = await query(queryText, queryParams);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Get filtered players error:', error);
    res.status(500).json({ error: 'Failed to fetch filtered players' });
  }
});

// Create new player - FIXED VERSION
router.post('/', authenticateToken, requireOrganization, playerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      dateOfBirth, 
      position, 
      clubId, 
      monthlyFee,
      userId
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
        message: 'You can only add players to your own clubs'
      });
    }

    // 🔥 FIX: Try to find user by email if userId not provided
    let playerUserId = userId || null;
    
    if (!playerUserId && email) {
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length > 0) {
        playerUserId = userResult.rows[0].id;
        console.log(`🔗 Linked player to existing user account: ${email}`);
      }
    }

    // Check if email already exists in this club
    if (email) {
      const existingPlayer = await query(
        'SELECT id FROM players WHERE email = $1 AND club_id = $2',
        [email, clubId]
      );
      
      if (existingPlayer.rows.length > 0) {
        return res.status(409).json({
          error: 'Player already exists',
          message: 'A player with this email already exists in this club'
        });
      }
    }

    // 🔥 FIX: Include user_id in the insert query
    const result = await query(`
      INSERT INTO players (first_name, last_name, email, phone, date_of_birth, position, club_id, monthly_fee, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      firstName,
      lastName,
      email || null,
      phone || null,
      dateOfBirth,
      position || null,
      clubId,
      monthlyFee || 0,
      playerUserId  // ← This is the key fix!
    ]);

    const newPlayer = result.rows[0];
    newPlayer.age = calculateAge(newPlayer.date_of_birth);

    // Update club member count
    await query(
      'UPDATE clubs SET member_count = member_count + 1 WHERE id = $1',
      [clubId]
    );

    res.status(201).json({
      message: 'Player added successfully',
      player: newPlayer
    });

  } catch (error) {
    console.error('Create player error:', error);
    res.status(500).json({
      error: 'Failed to create player',
      message: 'An error occurred while adding the player'
    });
  }
});

// Update player - ENHANCED VERSION
router.put('/:id', authenticateToken, requireOrganization, playerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if player exists and user has permission
    const playerResult = await query(queries.findPlayerById, [req.params.id]);
    if (playerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'Player with this ID does not exist'
      });
    }

    const player = playerResult.rows[0];

    // Verify user owns the club
    const clubResult = await query(queries.findClubById, [player.club_id]);
    const club = clubResult.rows[0];
    
    if (club.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update players in your own clubs'
      });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      dateOfBirth, 
      position, 
      monthlyFee,
      paymentStatus,
      attendanceRate,
      userId
    } = req.body;

    // 🔥 NEW: Handle user_id linking
    let playerUserId = userId || player.user_id;
    
    if (!playerUserId && email) {
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length > 0) {
        playerUserId = userResult.rows[0].id;
        console.log(`🔗 Linked player to existing user account during update: ${email}`);
      }
    }

    const result = await query(`
      UPDATE players SET 
        first_name = $1,
        last_name = $2,
        email = $3,
        phone = $4,
        date_of_birth = $5,
        position = $6,
        monthly_fee = $7,
        payment_status = $8,
        attendance_rate = $9,
        user_id = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      firstName,
      lastName,
      email || null,
      phone || null,
      dateOfBirth,
      position || null,
      monthlyFee || player.monthly_fee,
      paymentStatus || player.payment_status,
      attendanceRate || player.attendance_rate,
      playerUserId,
      req.params.id
    ]);

    const updatedPlayer = result.rows[0];
    updatedPlayer.age = calculateAge(updatedPlayer.date_of_birth);

    res.json({
      message: 'Player updated successfully',
      player: updatedPlayer
    });

  } catch (error) {
    console.error('Update player error:', error);
    res.status(500).json({
      error: 'Failed to update player',
      message: 'An error occurred while updating the player'
    });
  }
});

// Delete player
router.delete('/:id', authenticateToken, requireOrganization, async (req, res) => {
  try {
    // Check if player exists and user has permission
    const playerResult = await query(queries.findPlayerById, [req.params.id]);
    if (playerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'Player with this ID does not exist'
      });
    }

    const player = playerResult.rows[0];

    // Verify user owns the club
    const clubResult = await query(queries.findClubById, [player.club_id]);
    const club = clubResult.rows[0];
    
    if (club.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete players from your own clubs'
      });
    }

    // Delete player and update club member count in transaction
    await withTransaction(async (client) => {
      // Delete player
      await client.query('DELETE FROM players WHERE id = $1', [req.params.id]);
      
      // Update club member count
      await client.query(
        'UPDATE clubs SET member_count = member_count - 1 WHERE id = $1',
        [player.club_id]
      );
    });

    res.json({
      message: 'Player deleted successfully'
    });

  } catch (error) {
    console.error('Delete player error:', error);
    res.status(500).json({
      error: 'Failed to delete player',
      message: 'An error occurred while deleting the player'
    });
  }
});

// Get player statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const playerId = req.params.id;

    // Get player basic info
    const playerResult = await query(queries.findPlayerById, [playerId]);
    if (playerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'Player with this ID does not exist'
      });
    }

    // Get match statistics
    const matchStatsResult = await query(`
      SELECT 
        COUNT(pr.id) as matches_played,
        AVG(pr.rating) as average_rating,
        COUNT(CASE WHEN mr.result = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN mr.result = 'loss' THEN 1 END) as losses,
        COUNT(CASE WHEN mr.result = 'draw' THEN 1 END) as draws
      FROM player_ratings pr
      JOIN match_results mr ON pr.match_result_id = mr.id
      WHERE pr.player_id = $1
    `, [playerId]);

    // Get payment statistics
    const paymentStatsResult = await query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_paid,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END) as overdue_count
      FROM payments
      WHERE player_id = $1
    `, [playerId]);

    // Get attendance statistics
    const attendanceStatsResult = await query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN availability = 'yes' THEN 1 END) as attended,
        COUNT(CASE WHEN availability = 'no' THEN 1 END) as missed,
        COUNT(CASE WHEN availability = 'maybe' THEN 1 END) as maybe
      FROM availability_responses ar
      JOIN events e ON ar.event_id = e.id
      WHERE ar.player_id = $1
    `, [playerId]);

    const stats = {
      player: playerResult.rows[0],
      matches: matchStatsResult.rows[0] || {},
      payments: paymentStatsResult.rows[0] || {},
      attendance: attendanceStatsResult.rows[0] || {}
    };

    // Calculate additional metrics
    if (stats.attendance.total_events > 0) {
      stats.attendance.attendance_percentage = Math.round(
        (stats.attendance.attended / stats.attendance.total_events) * 100
      );
    }

    res.json(stats);

  } catch (error) {
    console.error('Get player stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch player statistics',
      message: 'An error occurred while fetching player statistics'
    });
  }
});

// Update player payment status
router.patch('/:id/payment-status', authenticateToken, requireOrganization, [
  body('paymentStatus').isIn(['paid', 'pending', 'overdue']).withMessage('Invalid payment status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { paymentStatus } = req.body;

    // Verify player exists and user has permission
    const playerResult = await query(queries.findPlayerById, [req.params.id]);
    if (playerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Player not found'
      });
    }

    const player = playerResult.rows[0];
    const clubResult = await query(queries.findClubById, [player.club_id]);
    const club = clubResult.rows[0];
    
    if (club.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Update payment status
    await query(`
      UPDATE players SET 
        payment_status = $1, 
        updated_at = NOW() 
      WHERE id = $2
    `, [paymentStatus, req.params.id]);

    res.json({
      message: 'Payment status updated successfully'
    });

  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      error: 'Failed to update payment status'
    });
  }
});

// Add a child profile (Parent context)
router.post('/child', authenticateToken, [
    body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
    body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
    body('dateOfBirth').isISO8601().withMessage('Valid date of birth required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { firstName, lastName, dateOfBirth, gender, position, location, sport, bio, medicalConditions } = req.body;

    // Create player linked to user, club_id NULL initially
    const result = await query(`
      INSERT INTO players (
        first_name, last_name, date_of_birth, position, user_id, 
        location, sport, gender, bio,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [firstName, lastName, dateOfBirth, position, req.user.id, location, sport, gender, bio]);

    const newChild = result.rows[0];
    newChild.age = calculateAge(newChild.date_of_birth);

    res.status(201).json({
        message: 'Child profile added successfully',
        player: newChild
    });

  } catch (error) {
    console.error('Add child error:', error);
    res.status(500).json({ error: 'Failed to add child profile' });
  }
});

// Update child profile (Parent context)
router.put('/child/:id', authenticateToken, [
    body('firstName').trim().isLength({ min: 1 }),
    body('lastName').trim().isLength({ min: 1 }),
    body('dateOfBirth').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { firstName, lastName, dateOfBirth, position, location, sport, gender, bio } = req.body;

    // Verify ownership
    const check = await query('SELECT id FROM players WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Child profile not found or access denied' });
    }

    const result = await query(`
        UPDATE players SET
            first_name = $1, last_name = $2, date_of_birth = $3, position = $4,
            location = $5, sport = $6, gender = $7, bio = $8,
            updated_at = NOW()
        WHERE id = $9
        RETURNING *
    `, [firstName, lastName, dateOfBirth, position, location, sport, gender, bio, req.params.id]);

    res.json({ message: 'Profile updated', player: result.rows[0] });

  } catch (error) {
    console.error('Update child error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Player History Routes

// GET /history/:playerId - Get history for a player
router.get('/:id/history', authenticateToken, async (req, res) => {
    try {
        const playerId = req.params.id;
        
        // Verify ownership (or club access - for now just parent ownership)
        const check = await query('SELECT id FROM players WHERE id=$1 AND user_id=$2', [playerId, req.user.id]);
        if (check.rows.length === 0) {
             // Try club access logic if needed, but primarily parent based
             return res.status(404).json({ error: 'Player not found or access denied' });
        }

        const result = await query(
            'SELECT * FROM player_history WHERE player_id = $1 ORDER BY end_date DESC NULLS FIRST',
            [playerId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Get history error', err);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

// POST /history/:playerId - Add history item
router.post('/:id/history', authenticateToken, async (req, res) => {
    try {
        const playerId = req.params.id;
        const { club_name, team_name, start_date, end_date, achievements } = req.body;

        const check = await query('SELECT id FROM players WHERE id=$1 AND user_id=$2', [playerId, req.user.id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Player not found' });

        const result = await query(`
            INSERT INTO player_history (player_id, club_name, team_name, start_date, end_date, achievements)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [playerId, club_name, team_name, start_date, end_date, achievements]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Add history error', err);
        res.status(500).json({ error: 'Failed' });
    }
});

// DELETE /history/:historyId
router.delete('/history/:historyId', authenticateToken, async (req, res) => {
    try {
        // Verify ownership via join
        const check = await query(`
            SELECT ph.id 
            FROM player_history ph
            JOIN players p ON ph.player_id = p.id
            WHERE ph.id = $1 AND p.user_id = $2
        `, [req.params.historyId, req.user.id]);

        if (check.rows.length === 0) return res.status(404).json({ error: 'Item not found' });

        await query('DELETE FROM player_history WHERE id = $1', [req.params.historyId]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('Delete history error', err);
        res.status(500).json({ error: 'Failed' });
    }
});


// Helper function to calculate age
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// ========================================
// PLAYER HISTORY / PREVIOUS TEAMS
// ========================================

// GET player history
router.get('/:id/history', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM player_history WHERE player_id = $1 ORDER BY start_date DESC',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get player history error:', error);
        res.status(500).json({ error: 'Failed to fetch player history' });
    }
});

// POST add player history
router.post('/:id/history', authenticateToken, [
    body('teamName').trim().notEmpty(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601()
], async (req, res) => {
    try {
        const { teamName, clubName, startDate, endDate, position, achievements } = req.body;
        
        const result = await query(`
            INSERT INTO player_history (player_id, team_name, club_name, start_date, end_date, position, achievements)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [req.params.id, teamName, clubName, startDate, endDate, position, achievements]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add player history error:', error);
        res.status(500).json({ error: 'Failed to add player history' });
    }
});

// DELETE player history entry
router.delete('/:id/history/:historyId', authenticateToken, async (req, res) => {
    try {
        await query(
            'DELETE FROM player_history WHERE id = $1 AND player_id = $2',
            [req.params.historyId, req.params.id]
        );
        res.json({ message: 'History entry deleted' });
    } catch (error) {
        console.error('Delete player history error:', error);
        res.status(500).json({ error: 'Failed to delete history entry' });
    }
});

module.exports = router;