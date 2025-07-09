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

// Get all players (with optional club filter)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { clubId, search, position } = req.query;
    
    let queryText = 'SELECT * FROM players WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;

    // Filter by club if provided
    if (clubId) {
      paramCount++;
      queryText += ` AND club_id = $${paramCount}`;
      queryParams.push(clubId);
    }

    // Search by name if provided
    if (search) {
      paramCount++;
      queryText += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Filter by position if provided
    if (position) {
      paramCount++;
      queryText += ` AND position ILIKE $${paramCount}`;
      queryParams.push(`%${position}%`);
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, queryParams);
    
    // Calculate ages for each player
    const playersWithAge = result.rows.map(player => ({
      ...player,
      age: calculateAge(player.date_of_birth)
    }));

    res.json(playersWithAge);

  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({
      error: 'Failed to fetch players',
      message: 'An error occurred while fetching players'
    });
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

module.exports = router;