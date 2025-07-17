const express = require('express');
const { query, queries } = require('../config/database');
const { authenticateToken, requireOrganization } = require('../middleware/auth');

const router = express.Router();

// Get admin dashboard data
router.get('/admin', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's clubs
    const clubsResult = await query(
      'SELECT * FROM clubs WHERE owner_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    const clubs = clubsResult.rows;
    
    if (clubs.length === 0) {
      return res.json({
        clubs: [],
        players: [],
        staff: [],
        events: [],
        teams: [],
        payments: [],
        statistics: {
          total_clubs: 0,
          total_players: 0,
          total_staff: 0,
          total_events: 0,
          total_teams: 0,
          monthly_revenue: 0
        }
      });
    }
    
    const clubIds = clubs.map(c => c.id);
    const clubIdPlaceholders = clubIds.map((_, i) => `$${i + 1}`).join(',');
    
    // Get players with team assignments
    const playersResult = await query(`
      SELECT 
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'team_id', tp.team_id,
              'team_name', t.name,
              'position', tp.position,
              'jersey_number', tp.jersey_number
            ) ORDER BY t.name
          ) FILTER (WHERE tp.team_id IS NOT NULL), 
          '[]'
        ) as team_assignments
      FROM players p
      LEFT JOIN team_players tp ON p.id = tp.player_id
      LEFT JOIN teams t ON tp.team_id = t.id
      WHERE p.club_id = ANY($1)
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [clubIds]);
    
    // Get staff
    const staffResult = await query(`
      SELECT * FROM staff 
      WHERE club_id = ANY($1)
      ORDER BY created_at DESC
    `, [clubIds]);
    
    // Get teams with player counts
    const teamsResult = await query(`
      SELECT 
        t.*,
        COUNT(tp.player_id) as player_count,
        s.first_name as coach_first_name,
        s.last_name as coach_last_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'first_name', p.first_name,
              'last_name', p.last_name,
              'position', tp.position,
              'jersey_number', tp.jersey_number
            ) ORDER BY p.last_name
          ) FILTER (WHERE p.id IS NOT NULL), 
          '[]'
        ) as players
      FROM teams t
      LEFT JOIN team_players tp ON t.id = tp.team_id
      LEFT JOIN players p ON tp.player_id = p.id
      LEFT JOIN staff s ON t.coach_id = s.id
      WHERE t.club_id = ANY($1)
      GROUP BY t.id, s.first_name, s.last_name
      ORDER BY t.created_at DESC
    `, [clubIds]);
    
    // Get events
    const eventsResult = await query(`
      SELECT * FROM events 
      WHERE club_id = ANY($1)
      ORDER BY event_date DESC
    `, [clubIds]);
    
    // Get payments
    const paymentsResult = await query(`
      SELECT p.*, pl.first_name as player_first_name, pl.last_name as player_last_name
      FROM payments p
      JOIN players pl ON p.player_id = pl.id
      WHERE p.club_id = ANY($1)
      ORDER BY p.due_date DESC
    `, [clubIds]);
    
    // Calculate statistics
    const totalPlayers = playersResult.rows.length;
    const totalStaff = staffResult.rows.length;
    const totalEvents = eventsResult.rows.length;
    const totalTeams = teamsResult.rows.length;
    const monthlyRevenue = playersResult.rows.reduce((sum, player) => 
      sum + (parseFloat(player.monthly_fee) || 0), 0
    );
    
    res.json({
      clubs,
      players: playersResult.rows,
      staff: staffResult.rows,
      events: eventsResult.rows,
      teams: teamsResult.rows,
      payments: paymentsResult.rows,
      statistics: {
        total_clubs: clubs.length,
        total_players: totalPlayers,
        total_staff: totalStaff,
        total_events: totalEvents,
        total_teams: totalTeams,
        monthly_revenue: monthlyRevenue
      }
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: 'An error occurred while fetching dashboard data',
      details: error.message
    });
  }
});

// 🔥 FIXED: Get player dashboard data
router.get('/player', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('📊 Loading player dashboard for user:', userId);
    
    // Find player record for this user - FIXED QUERY
    const playerResult = await query(`
      SELECT p.*, c.name as club_name, c.id as club_id
      FROM players p
      LEFT JOIN clubs c ON p.club_id = c.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
      LIMIT 1
    `, [userId]);
    
    let player = null;
    let clubIds = [];
    
    if (playerResult.rows.length > 0) {
      player = playerResult.rows[0];
      if (player.club_id) {
        clubIds = [player.club_id];
      }
      console.log('✅ Found player record:', player.first_name, player.last_name);
    } else {
      console.log('ℹ️ No player record found for user:', userId);
    }
    
    // Get player's clubs (either from player record or empty)
    let clubs = [];
    if (clubIds.length > 0) {
      const clubsResult = await query(`
        SELECT * FROM clubs WHERE id = ANY($1)
      `, [clubIds]);
      clubs = clubsResult.rows;
    }
    
    // Get player's teams (only if player exists)
    let teams = [];
    if (player) {
      const teamsResult = await query(`
        SELECT t.*, 
               tp.position as player_position,
               tp.jersey_number,
               s.first_name as coach_first_name,
               s.last_name as coach_last_name,
               s.email as coach_email
        FROM teams t
        JOIN team_players tp ON t.id = tp.team_id
        LEFT JOIN staff s ON t.coach_id = s.id
        WHERE tp.player_id = $1
        ORDER BY t.name
      `, [player.id]);
      teams = teamsResult.rows;
    }
    
    // Get all available events (public events)
    const eventsResult = await query(`
      SELECT e.*, c.name as club_name
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.event_date >= CURRENT_DATE
      ORDER BY e.event_date ASC
      LIMIT 50
    `);
    
    // Get player's payments (only if player exists)
    let payments = [];
    if (player) {
      const paymentsResult = await query(`
        SELECT * FROM payments
        WHERE player_id = $1
        ORDER BY due_date DESC
      `, [player.id]);
      payments = paymentsResult.rows;
    }
    
    // Get player's bookings (only if player exists)
    let bookings = [];
    if (player) {
      const bookingsResult = await query(`
        SELECT eb.*, e.title as event_title, e.event_date
        FROM event_bookings eb
        JOIN events e ON eb.event_id = e.id
        WHERE eb.user_id = $1
        ORDER BY e.event_date DESC
      `, [userId]);
      bookings = bookingsResult.rows;
    }
    
    // Get player's applications
    const applicationsResult = await query(`
      SELECT ca.*, c.name as club_name
      FROM club_applications ca
      JOIN clubs c ON ca.club_id = c.id
      WHERE ca.user_id = $1
      ORDER BY ca.submitted_at DESC
    `, [userId]);
    
    console.log('📊 Player dashboard data loaded:', {
      hasPlayer: !!player,
      clubsCount: clubs.length,
      teamsCount: teams.length,
      eventsCount: eventsResult.rows.length,
      paymentsCount: payments.length
    });
    
    res.json({
      player,
      clubs,
      teams,
      events: eventsResult.rows,
      payments,
      bookings,
      applications: applicationsResult.rows
    });

  } catch (error) {
    console.error('Get player dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch player dashboard data',
      message: 'An error occurred while fetching player dashboard data',
      details: error.message
    });
  }
});

module.exports = router;