const express = require('express');
const { query, queries } = require('../config/database');
const { authenticateToken, requireOrganization } = require('../middleware/auth');

const router = express.Router();

// Get admin dashboard data
router.get('/admin', authenticateToken, requireOrganization, async (req, res) => {
  try {
    // Get user's clubs
    const clubsResult = await query(queries.findClubsByOwner, [req.user.id]);
    const clubs = clubsResult.rows;

    if (clubs.length === 0) {
      return res.json({
        clubs: [],
        players: [],
        staff: [],
        events: [],
        teams: [],
        statistics: {
          total_clubs: 0,
          total_players: 0,
          total_staff: 0,
          total_events: 0,
          total_teams: 0
        }
      });
    }

    const clubIds = clubs.map(club => club.id);

    // Get players for all clubs
    const playersResult = await query(`
      SELECT * FROM players 
      WHERE club_id = ANY($1::uuid[])
      ORDER BY created_at DESC
    `, [clubIds]);

    // Get staff for all clubs
    const staffResult = await query(`
      SELECT * FROM staff 
      WHERE club_id = ANY($1::uuid[])
      ORDER BY created_at DESC
    `, [clubIds]);

    // Get events for all clubs
    const eventsResult = await query(`
      SELECT * FROM events 
      WHERE club_id = ANY($1::uuid[])
      ORDER BY event_date DESC
      LIMIT 20
    `, [clubIds]);

    // Get teams for all clubs
    const teamsResult = await query(`
      SELECT t.*, COUNT(tp.player_id) as player_count
      FROM teams t
      LEFT JOIN team_players tp ON t.id = tp.team_id
      WHERE t.club_id = ANY($1::uuid[])
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [clubIds]);

    // Get recent payments
    const paymentsResult = await query(`
      SELECT p.*, pl.first_name, pl.last_name, c.name as club_name
      FROM payments p
      JOIN players pl ON p.player_id = pl.id
      JOIN clubs c ON p.club_id = c.id
      WHERE p.club_id = ANY($1::uuid[])
      ORDER BY p.created_at DESC
      LIMIT 10
    `, [clubIds]);

    // Get upcoming events
    const upcomingEventsResult = await query(`
      SELECT * FROM events 
      WHERE club_id = ANY($1::uuid[]) AND event_date >= CURRENT_DATE
      ORDER BY event_date ASC
      LIMIT 5
    `, [clubIds]);

    // Calculate statistics
    const statistics = {
      total_clubs: clubs.length,
      total_players: playersResult.rows.length,
      total_staff: staffResult.rows.length,
      total_events: eventsResult.rows.length,
      total_teams: teamsResult.rows.length,
      pending_payments: paymentsResult.rows.filter(p => p.payment_status === 'pending').length,
      overdue_payments: paymentsResult.rows.filter(p => p.payment_status === 'overdue').length
    };

    res.json({
      clubs: clubs,
      players: playersResult.rows,
      staff: staffResult.rows,
      events: eventsResult.rows,
      teams: teamsResult.rows,
      payments: paymentsResult.rows,
      upcoming_events: upcomingEventsResult.rows,
      statistics
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      error: 'Failed to load dashboard data',
      message: 'An error occurred while loading dashboard'
    });
  }
});

// Get coach dashboard data
router.get('/coach', authenticateToken, async (req, res) => {
  try {
    // Find staff records for this user
    const staffResult = await query(`
      SELECT * FROM staff 
      WHERE user_id = $1 AND role IN ('coach', 'assistant-coach', 'coaching-supervisor')
    `, [req.user.id]);

    if (staffResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not registered as a coach'
      });
    }

    const staff = staffResult.rows[0];

    // Get teams coached by this user
    const teamsResult = await query(`
      SELECT t.*, c.name as club_name, COUNT(tp.player_id) as player_count
      FROM teams t
      JOIN clubs c ON t.club_id = c.id
      LEFT JOIN team_players tp ON t.id = tp.team_id
      WHERE t.coach_id = $1
      GROUP BY t.id, c.name
      ORDER BY t.created_at DESC
    `, [staff.id]);

    // Get upcoming events for coached teams
    const upcomingEventsResult = await query(`
      SELECT e.*, t.name as team_name
      FROM events e
      JOIN teams t ON e.team_id = t.id
      WHERE t.coach_id = $1 AND e.event_date >= CURRENT_DATE
      ORDER BY e.event_date ASC
      LIMIT 10
    `, [staff.id]);

    // Get players in coached teams
    const playersResult = await query(`
      SELECT p.*, tp.position, tp.jersey_number, t.name as team_name
      FROM players p
      JOIN team_players tp ON p.id = tp.player_id
      JOIN teams t ON tp.team_id = t.id
      WHERE t.coach_id = $1
      ORDER BY t.name, p.last_name
    `, [staff.id]);

    // Get recent match results
    const matchResultsResult = await query(`
      SELECT e.*, mr.home_score, mr.away_score, mr.result, t.name as team_name
      FROM events e
      JOIN match_results mr ON e.id = mr.event_id
      JOIN teams t ON e.team_id = t.id
      WHERE t.coach_id = $1 AND e.event_type = 'match'
      ORDER BY e.event_date DESC
      LIMIT 5
    `, [staff.id]);

    const statistics = {
      teams_coached: teamsResult.rows.length,
      total_players: playersResult.rows.length,
      upcoming_events: upcomingEventsResult.rows.length,
      recent_matches: matchResultsResult.rows.length
    };

    res.json({
      staff,
      teams: teamsResult.rows,
      players: playersResult.rows,
      upcoming_events: upcomingEventsResult.rows,
      recent_matches: matchResultsResult.rows,
      statistics
    });

  } catch (error) {
    console.error('Coach dashboard error:', error);
    res.status(500).json({
      error: 'Failed to load dashboard data',
      message: 'An error occurred while loading dashboard'
    });
  }
});

// Get player dashboard data
router.get('/player', authenticateToken, async (req, res) => {
  try {
    // Get all clubs for browsing
    const clubsResult = await query(queries.findAllClubs);

    // Get user's players (if any)
    const playersResult = await query(`
      SELECT p.*, c.name as club_name
      FROM players p
      JOIN clubs c ON p.club_id = c.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    // Get user's bookings
    const bookingsResult = await query(`
      SELECT eb.*, e.title, e.event_date, e.event_time, e.location, c.name as club_name
      FROM event_bookings eb
      JOIN events e ON eb.event_id = e.id
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE eb.user_id = $1
      ORDER BY e.event_date DESC
      LIMIT 10
    `, [req.user.id]);

    // Get upcoming events the user might be interested in
    const upcomingEventsResult = await query(`
      SELECT e.*, c.name as club_name, 
             COUNT(eb.id) as booking_count
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      LEFT JOIN event_bookings eb ON e.id = eb.event_id AND eb.booking_status = 'confirmed'
      WHERE e.event_date >= CURRENT_DATE
      GROUP BY e.id, c.name
      ORDER BY e.event_date ASC
      LIMIT 10
    `, []);

    // Get user's payments (if they have players)
    let payments = [];
    if (playersResult.rows.length > 0) {
      const playerIds = playersResult.rows.map(p => p.id);
      const paymentsResult = await query(`
        SELECT p.*, pl.first_name, pl.last_name, c.name as club_name
        FROM payments p
        JOIN players pl ON p.player_id = pl.id
        JOIN clubs c ON p.club_id = c.id
        WHERE p.player_id = ANY($1::uuid[])
        ORDER BY p.due_date DESC
        LIMIT 10
      `, [playerIds]);
      
      payments = paymentsResult.rows;
    }

    // Get user's applications
    const applicationsResult = await query(`
      SELECT ca.*, c.name as club_name
      FROM club_applications ca
      JOIN clubs c ON ca.club_id = c.id
      WHERE ca.user_id = $1
      ORDER BY ca.submitted_at DESC
    `, [req.user.id]);

    const statistics = {
      total_bookings: bookingsResult.rows.length,
      confirmed_bookings: bookingsResult.rows.filter(b => b.booking_status === 'confirmed').length,
      pending_payments: payments.filter(p => p.payment_status === 'pending').length,
      overdue_payments: payments.filter(p => p.payment_status === 'overdue').length,
      pending_applications: applicationsResult.rows.filter(a => a.application_status === 'pending').length
    };

    res.json({
      clubs: clubsResult.rows,
      players: playersResult.rows,
      bookings: bookingsResult.rows,
      upcoming_events: upcomingEventsResult.rows,
      payments,
      applications: applicationsResult.rows,
      statistics
    });

  } catch (error) {
    console.error('Player dashboard error:', error);
    res.status(500).json({
      error: 'Failed to load dashboard data',
      message: 'An error occurred while loading dashboard'
    });
  }
});

module.exports = router;