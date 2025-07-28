const express = require('express');
const { query, queries, withTransaction } = require('../config/database');
const { authenticateToken, requireOrganization, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation rules
const eventValidation = [
  body('title').trim().isLength({ min: 1 }).withMessage('Event title is required'),
  body('eventType').isIn(['training', 'match', 'tournament', 'camp', 'social', 'talent-id']).withMessage('Invalid event type'),
  body('eventDate').isISO8601().withMessage('Please provide a valid event date'),
  body('eventTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Please provide a valid time (HH:MM)'),
  body('location').optional().trim(),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a positive number'),
  body('clubId').optional().isUUID().withMessage('Valid club ID required'),
  body('teamId').optional().isUUID().withMessage('Valid team ID required')
];

// Get all events (public with optional authentication)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      clubId, 
      teamId, 
      eventType, 
      location, 
      startDate, 
      endDate, 
      upcoming,
      limit = 50 
    } = req.query;
    
    let queryText = `
      SELECT e.*, 
             c.name as club_name,
             t.name as team_name,
             COUNT(eb.id) as booking_count
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      LEFT JOIN teams t ON e.team_id = t.id
      LEFT JOIN event_bookings eb ON e.id = eb.event_id AND eb.booking_status = 'confirmed'
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Filter by club if provided
    if (clubId) {
      paramCount++;
      queryText += ` AND e.club_id = $${paramCount}`;
      queryParams.push(clubId);
    }

    // Filter by team if provided
    if (teamId) {
      paramCount++;
      queryText += ` AND e.team_id = $${paramCount}`;
      queryParams.push(teamId);
    }

    // Filter by event type if provided
    if (eventType) {
      paramCount++;
      queryText += ` AND e.event_type = $${paramCount}`;
      queryParams.push(eventType);
    }

    // Filter by location if provided
    if (location) {
      paramCount++;
      queryText += ` AND e.location ILIKE $${paramCount}`;
      queryParams.push(`%${location}%`);
    }

    // Filter by date range
    if (startDate) {
      paramCount++;
      queryText += ` AND e.event_date >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      queryText += ` AND e.event_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    // Filter upcoming events
    if (upcoming === 'true') {
      queryText += ` AND e.event_date >= CURRENT_DATE`;
    }

    queryText += ` 
      GROUP BY e.id, c.name, t.name
      ORDER BY e.event_date ASC, e.event_time ASC
      LIMIT $${paramCount + 1}
    `;
    queryParams.push(parseInt(limit));

    const result = await query(queryText, queryParams);
    
    // Calculate spots available for each event
    const eventsWithSpots = result.rows.map(event => ({
      ...event,
      spots_available: event.capacity ? event.capacity - event.booking_count : null,
      is_full: event.capacity ? event.booking_count >= event.capacity : false
    }));

    res.json(eventsWithSpots);

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      error: 'Failed to fetch events',
      message: 'An error occurred while fetching events'
    });
  }
});

// Get specific event
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const eventResult = await query(`
      SELECT e.*, 
             c.name as club_name,
             c.location as club_location,
             t.name as team_name,
             t.age_group,
             u.first_name as creator_first_name,
             u.last_name as creator_last_name
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      LEFT JOIN teams t ON e.team_id = t.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `, [req.params.id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Event not found',
        message: 'Event with this ID does not exist'
      });
    }

    const event = eventResult.rows[0];

    // Get bookings count
    const bookingsResult = await query(`
      SELECT COUNT(*) as booking_count
      FROM event_bookings
      WHERE event_id = $1 AND booking_status = 'confirmed'
    `, [req.params.id]);

    event.booking_count = parseInt(bookingsResult.rows[0].booking_count);
    event.spots_available = event.capacity ? event.capacity - event.booking_count : null;
    event.is_full = event.capacity ? event.booking_count >= event.capacity : false;

    // Get match result if it's a match and has been played
    if (event.event_type === 'match' && new Date(event.event_date) < new Date()) {
      const matchResult = await query(`
        SELECT * FROM match_results WHERE event_id = $1
      `, [req.params.id]);
      
      event.match_result = matchResult.rows[0] || null;
    }

    // If user is authenticated, check if they've booked this event
    if (req.user) {
      const userBookingResult = await query(`
        SELECT * FROM event_bookings
        WHERE event_id = $1 AND user_id = $2
      `, [req.params.id, req.user.id]);
      
      event.user_booking = userBookingResult.rows[0] || null;
    }

    res.json(event);

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      error: 'Failed to fetch event',
      message: 'An error occurred while fetching event details'
    });
  }
});

// Create new event
router.post('/', authenticateToken, requireOrganization, eventValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    let { 
      title, 
      description, 
      eventType, 
      eventDate, 
      eventTime, 
      location, 
      price, 
      capacity,
      clubId,
      teamId,
      opponent
    } = req.body;

    // 🔧 FIXED: Get user's club if not provided
    let userClubId = clubId;
    if (!userClubId) {
      const clubResult = await query('SELECT id FROM clubs WHERE owner_id = $1 LIMIT 1', [req.user.id]);
      if (clubResult.rows.length === 0) {
        return res.status(404).json({
          error: 'No club found',
          message: 'You must have a club to create events'
        });
      }
      userClubId = clubResult.rows[0].id;
    }

    // Verify club exists and user owns it (if specified)
    if (clubId) {
      const clubResult = await query('SELECT * FROM clubs WHERE id = $1', [clubId]);
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
          message: 'You can only create events for your own clubs'
        });
      }
    }

    // Verify team exists and belongs to the club (if specified)
    if (teamId) {
      const teamResult = await query('SELECT * FROM teams WHERE id = $1', [teamId]);
      if (teamResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Team not found',
          message: 'The specified team does not exist'
        });
      }

      const team = teamResult.rows[0];
      
      // 🔧 FIXED: Check if team belongs to user's club
      if (team.club_id !== userClubId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only create events for teams in your own clubs'
        });
      }

      // If team is specified but club isn't, use the team's club
      if (!clubId) {
        clubId = team.club_id;
      }
    }

    // 🔧 FIXED: Use proper query for creating event
    const result = await query(`
      INSERT INTO events (
        title, description, event_type, event_date, event_time, 
        location, price, capacity, spots_available, club_id, 
        team_id, opponent, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `, [
      title,
      description || null,
      eventType,
      eventDate,
      eventTime || null,
      location || null,
      price || 0,
      capacity || null,
      capacity || null, // spots_available initially equals capacity
      clubId || userClubId,
      teamId || null,
      opponent || null,
      req.user.id
    ]);

    const newEvent = result.rows[0];

    res.status(201).json({
      message: 'Event created successfully',
      event: newEvent
    });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      error: 'Failed to create event',
      message: 'An error occurred while creating the event'
    });
  }
});

// Update event
router.put('/:id', authenticateToken, requireOrganization, eventValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if event exists and user has permission
    const eventResult = await query(`
      SELECT e.*, c.owner_id 
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = $1
    `, [req.params.id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Event not found',
        message: 'Event with this ID does not exist'
      });
    }

    const event = eventResult.rows[0];
    
    // Check if user created the event or owns the club
    if (event.created_by !== req.user.id && event.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own events'
      });
    }

    const { 
      title, 
      description, 
      eventType, 
      eventDate, 
      eventTime, 
      location, 
      price, 
      capacity,
      opponent
    } = req.body;

    const result = await query(`
      UPDATE events SET 
        title = $1,
        description = $2,
        event_type = $3,
        event_date = $4,
        event_time = $5,
        location = $6,
        price = $7,
        capacity = $8,
        opponent = $9,
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      title,
      description || null,
      eventType,
      eventDate,
      eventTime || null,
      location || null,
      price || event.price,
      capacity || null,
      opponent || null,
      req.params.id
    ]);

    const updatedEvent = result.rows[0];

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });

  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      error: 'Failed to update event',
      message: 'An error occurred while updating the event'
    });
  }
});

// Delete event
router.delete('/:id', authenticateToken, requireOrganization, async (req, res) => {
  try {
    // Check if event exists and user has permission
    const eventResult = await query(`
      SELECT e.*, c.owner_id 
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = $1
    `, [req.params.id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Event not found',
        message: 'Event with this ID does not exist'
      });
    }

    const event = eventResult.rows[0];
    
    // Check if user created the event or owns the club
    if (event.created_by !== req.user.id && event.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own events'
      });
    }

    // Delete event and related data in transaction
    await withTransaction(async (client) => {
      // Delete event bookings
      await client.query('DELETE FROM event_bookings WHERE event_id = $1', [req.params.id]);
      
      // Delete availability responses
      await client.query('DELETE FROM availability_responses WHERE event_id = $1', [req.params.id]);
      
      // Delete match results
      await client.query('DELETE FROM match_results WHERE event_id = $1', [req.params.id]);
      
      // Delete event
      await client.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    });

    res.json({
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      error: 'Failed to delete event',
      message: 'An error occurred while deleting the event'
    });
  }
});

// Book event
router.post('/:id/book', authenticateToken, [
  body('playerData').optional().isObject().withMessage('Player data must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { playerData } = req.body;

    // Get event details
    const eventResult = await query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Event not found',
        message: 'Event with this ID does not exist'
      });
    }

    const event = eventResult.rows[0];

    // Check if event is in the future
    if (new Date(event.event_date) < new Date()) {
      return res.status(400).json({
        error: 'Event has passed',
        message: 'Cannot book past events'
      });
    }

    // Check if user already booked this event
    const existingBooking = await query(`
      SELECT id FROM event_bookings
      WHERE event_id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);
    
    if (existingBooking.rows.length > 0) {
      return res.status(409).json({
        error: 'Already booked',
        message: 'You have already booked this event'
      });
    }

    // Check capacity
    const bookingsCount = await query(`
      SELECT COUNT(*) as count
      FROM event_bookings
      WHERE event_id = $1 AND booking_status = 'confirmed'
    `, [req.params.id]);

    const currentBookings = parseInt(bookingsCount.rows[0].count);
    
    if (event.capacity && currentBookings >= event.capacity) {
      return res.status(400).json({
        error: 'Event is full',
        message: 'No more spots available for this event'
      });
    }

    // Create booking in transaction
    const booking = await withTransaction(async (client) => {
      let playerId = null;

      // If player data is provided, create or find player
      if (playerData) {
        const { firstName, lastName, email, phone, dateOfBirth } = playerData;
        
        // Try to find existing player
        const existingPlayer = await client.query(`
          SELECT id FROM players 
          WHERE email = $1 AND club_id = $2
        `, [email, event.club_id]);

        if (existingPlayer.rows.length > 0) {
          playerId = existingPlayer.rows[0].id;
        } else {
          // Create new player
          const newPlayer = await client.query(`
            INSERT INTO players (first_name, last_name, email, phone, date_of_birth, club_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
          `, [firstName, lastName, email, phone, dateOfBirth, event.club_id]);
          
          playerId = newPlayer.rows[0].id;
        }
      }

      // Create booking
      const bookingResult = await client.query(`
        INSERT INTO event_bookings (event_id, user_id, player_id, amount_paid)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [req.params.id, req.user.id, playerId, event.price || 0]);

      // Update spots available
      if (event.capacity) {
        await client.query(`
          UPDATE events 
          SET spots_available = capacity - (
            SELECT COUNT(*) FROM event_bookings 
            WHERE event_id = $1 AND booking_status = 'confirmed'
          )
          WHERE id = $1
        `, [req.params.id]);
      }

      return bookingResult.rows[0];
    });

    res.status(201).json({
      message: 'Event booked successfully',
      booking
    });

  } catch (error) {
    console.error('Book event error:', error);
    res.status(500).json({
      error: 'Failed to book event',
      message: 'An error occurred while booking the event'
    });
  }
});

// Cancel booking
router.post('/bookings/:bookingId/cancel', authenticateToken, async (req, res) => {
  try {
    // Get booking details
    const bookingResult = await query(`
      SELECT * FROM event_bookings
      WHERE id = $1 AND user_id = $2
    `, [req.params.bookingId, req.user.id]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Booking not found',
        message: 'Booking does not exist or does not belong to you'
      });
    }

    const booking = bookingResult.rows[0];

    // Get event details
    const eventResult = await query('SELECT * FROM events WHERE id = $1', [booking.event_id]);
    const event = eventResult.rows[0];

    // Check if event is in the future (allow cancellation up to event time)
    if (new Date(event.event_date) < new Date()) {
      return res.status(400).json({
        error: 'Cannot cancel',
        message: 'Cannot cancel bookings for past events'
      });
    }

    // Update booking status in transaction
    await withTransaction(async (client) => {
      // Cancel booking
      await client.query(`
        UPDATE event_bookings 
        SET booking_status = 'cancelled', updated_at = NOW()
        WHERE id = $1
      `, [req.params.bookingId]);

      // Update spots available
      if (event.capacity) {
        await client.query(`
          UPDATE events 
          SET spots_available = capacity - (
            SELECT COUNT(*) FROM event_bookings 
            WHERE event_id = $1 AND booking_status = 'confirmed'
          )
          WHERE id = $1
        `, [booking.event_id]);
      }
    });

    res.json({
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      error: 'Failed to cancel booking',
      message: 'An error occurred while cancelling the booking'
    });
  }
});

// Get event bookings (for event organizers)
router.get('/:id/bookings', authenticateToken, requireOrganization, async (req, res) => {
  try {
    // Verify user has permission to view bookings
    const eventResult = await query(`
      SELECT e.*, c.owner_id 
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = $1
    `, [req.params.id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    const event = eventResult.rows[0];
    
    if (event.created_by !== req.user.id && event.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Get all bookings for the event
    const bookingsResult = await query(`
      SELECT eb.*, 
             u.first_name as user_first_name,
             u.last_name as user_last_name,
             u.email as user_email,
             p.first_name as player_first_name,
             p.last_name as player_last_name,
             p.email as player_email
      FROM event_bookings eb
      JOIN users u ON eb.user_id = u.id
      LEFT JOIN players p ON eb.player_id = p.id
      WHERE eb.event_id = $1
      ORDER BY eb.booked_at ASC
    `, [req.params.id]);

    res.json({
      event: {
        id: event.id,
        title: event.title,
        event_date: event.event_date,
        capacity: event.capacity
      },
      bookings: bookingsResult.rows
    });

  } catch (error) {
    console.error('Get event bookings error:', error);
    res.status(500).json({
      error: 'Failed to fetch event bookings'
    });
  }
});

// Get user's bookings
router.get('/bookings/my-bookings', authenticateToken, async (req, res) => {
  try {
    const { status, upcoming } = req.query;

    let queryText = `
      SELECT eb.*, 
             e.title,
             e.event_type,
             e.event_date,
             e.event_time,
             e.location,
             c.name as club_name
      FROM event_bookings eb
      JOIN events e ON eb.event_id = e.id
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE eb.user_id = $1
    `;
    const queryParams = [req.user.id];
    let paramCount = 1;

    // Filter by status if provided
    if (status) {
      paramCount++;
      queryText += ` AND eb.booking_status = $${paramCount}`;
      queryParams.push(status);
    }

    // Filter upcoming events
    if (upcoming === 'true') {
      queryText += ` AND e.event_date >= CURRENT_DATE`;
    }

    queryText += ` ORDER BY e.event_date ASC`;

    const result = await query(queryText, queryParams);
    res.json(result.rows);

  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      error: 'Failed to fetch your bookings'
    });
  }
});

// Submit availability for team event
router.post('/:id/availability', authenticateToken, [
  body('availability').isIn(['yes', 'no', 'maybe']).withMessage('Invalid availability status'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { availability, notes } = req.body;

    // Get event and verify it's a team event
    const eventResult = await query(`
      SELECT e.*, t.id as team_id
      FROM events e
      LEFT JOIN teams t ON e.team_id = t.id
      WHERE e.id = $1
    `, [req.params.id]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    const event = eventResult.rows[0];

    if (!event.team_id) {
      return res.status(400).json({
        error: 'Not a team event',
        message: 'Availability can only be submitted for team events'
      });
    }

    // Check if user has a player in this team
    const playerResult = await query(`
      SELECT p.id FROM players p
      JOIN team_players tp ON p.id = tp.player_id
      WHERE tp.team_id = $1 AND p.user_id = $2
    `, [event.team_id, req.user.id]);

    if (playerResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Not a team member',
        message: 'You must be a member of this team to submit availability'
      });
    }

    const playerId = playerResult.rows[0].id;

    // Insert or update availability
    const result = await query(`
      INSERT INTO availability_responses (event_id, player_id, availability, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (event_id, player_id)
      DO UPDATE SET 
        availability = EXCLUDED.availability,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `, [req.params.id, playerId, availability, notes || null]);

    res.json({
      message: 'Availability submitted successfully',
      response: result.rows[0]
    });

  } catch (error) {
    console.error('Submit availability error:', error);
    res.status(500).json({
      error: 'Failed to submit availability'
    });
  }
});

// Get event availability responses (for coaches/organizers)
router.get('/:id/availability', authenticateToken, async (req, res) => {
  try {
    // Get event and verify permissions
    const eventResult = await query(`
      SELECT e.*, c.owner_id, t.coach_id
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      LEFT JOIN teams t ON e.team_id = t.id
      WHERE e.id = $1
    `, [req.params.id]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    const event = eventResult.rows[0];

    // Check if user has permission to view availability
    const hasPermission = event.created_by === req.user.id || 
                         event.owner_id === req.user.id ||
                         event.coach_id === req.user.id;

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Get availability responses
    const responsesResult = await query(`
      SELECT ar.*, 
             p.first_name,
             p.last_name,
             tp.position
      FROM availability_responses ar
      JOIN players p ON ar.player_id = p.id
      LEFT JOIN team_players tp ON p.id = tp.player_id AND tp.team_id = $2
      WHERE ar.event_id = $1
      ORDER BY ar.availability, p.last_name
    `, [req.params.id, event.team_id]);

    // Group responses by availability
    const grouped = {
      yes: [],
      no: [],
      maybe: []
    };

    responsesResult.rows.forEach(response => {
      grouped[response.availability].push(response);
    });

    res.json({
      event: {
        id: event.id,
        title: event.title,
        event_date: event.event_date
      },
      responses: grouped,
      summary: {
        total: responsesResult.rows.length,
        available: grouped.yes.length,
        unavailable: grouped.no.length,
        maybe: grouped.maybe.length
      }
    });

  } catch (error) {
    console.error('Get event availability error:', error);
    res.status(500).json({
      error: 'Failed to fetch availability responses'
    });
  }
});

module.exports = router;