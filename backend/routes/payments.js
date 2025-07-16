const express = require('express');
const { query, queries, withTransaction } = require('../config/database');
const { authenticateToken, requireOrganization, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Validation rules
const paymentValidation = [
  body('playerId').isUUID().withMessage('Valid player ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('paymentType').isIn(['monthly_fee', 'event_booking', 'registration', 'equipment']).withMessage('Invalid payment type'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('dueDate').isISO8601().withMessage('Please provide a valid due date')
];

// Get all payments (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { playerId, clubId, status, paymentType, startDate, endDate } = req.query;
    
    let queryText = `
      SELECT p.*, 
             pl.first_name as player_first_name,
             pl.last_name as player_last_name,
             pl.email as player_email,
             c.name as club_name
      FROM payments p
      JOIN players pl ON p.player_id = pl.id
      JOIN clubs c ON p.club_id = c.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    // Filter by player if provided
    if (playerId) {
      paramCount++;
      queryText += ` AND p.player_id = $${paramCount}`;
      queryParams.push(playerId);
    }

    // Filter by club if provided
    if (clubId) {
      paramCount++;
      queryText += ` AND p.club_id = $${paramCount}`;
      queryParams.push(clubId);
    }

    // Filter by status if provided
    if (status) {
      paramCount++;
      queryText += ` AND p.payment_status = $${paramCount}`;
      queryParams.push(status);
    }

    // Filter by payment type if provided
    if (paymentType) {
      paramCount++;
      queryText += ` AND p.payment_type = $${paramCount}`;
      queryParams.push(paymentType);
    }

    // Filter by date range
    if (startDate) {
      paramCount++;
      queryText += ` AND p.due_date >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      queryText += ` AND p.due_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    // Check if user has permission to view these payments
    if (req.user.account_type === 'organization') {
      // Organization can see payments for their clubs only
      paramCount++;
      queryText += ` AND c.owner_id = $${paramCount}`;
      queryParams.push(req.user.id);
    } else {
      // Regular users can only see their own payments
      paramCount++;
      queryText += ` AND pl.user_id = $${paramCount}`;
      queryParams.push(req.user.id);
    }

    queryText += ` ORDER BY p.due_date DESC, p.created_at DESC`;

    const result = await query(queryText, queryParams);
    res.json(result.rows);

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      error: 'Failed to fetch payments',
      message: 'An error occurred while fetching payments'
    });
  }
});

// 🔥 FIXED: CREATE STRIPE PAYMENT INTENT - PRODUCTION READY
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, paymentId, metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    // Get payment details if paymentId provided
    let paymentDetails = null;
    if (paymentId) {
      const paymentResult = await query(`
        SELECT p.*, pl.first_name, pl.last_name, pl.email, c.name as club_name
        FROM payments p
        JOIN players pl ON p.player_id = pl.id
        JOIN clubs c ON p.club_id = c.id
        WHERE p.id = $1
      `, [paymentId]);
      
      if (paymentResult.rows.length > 0) {
        paymentDetails = paymentResult.rows[0];
      }
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to pence
      currency: 'gbp',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        paymentId: paymentId || '',
        playerName: paymentDetails ? `${paymentDetails.first_name} ${paymentDetails.last_name}` : '',
        clubName: paymentDetails ? paymentDetails.club_name : '',
        environment: process.env.NODE_ENV || 'development',
        ...metadata
      },
      description: paymentDetails ? paymentDetails.description : `ClubHub Payment of £${amount}`,
      statement_descriptor: 'CLUBHUB*', // Appears on customer's bank statement
      receipt_email: paymentDetails ? paymentDetails.email : metadata.email
    });

    console.log(`💳 Stripe Payment Intent created: ${paymentIntent.id} for £${amount}`);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      paymentDetails: paymentDetails
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      error: 'Failed to create payment intent',
      message: error.message
    });
  }
});

// 🔥 FIXED: CONFIRM STRIPE PAYMENT - PRODUCTION READY
router.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId, paymentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: 'Payment Intent ID is required'
      });
    }

    // Retrieve the payment intent from Stripe to verify it succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'Payment not completed',
        message: 'Payment intent status: ' + paymentIntent.status
      });
    }

    // If paymentId provided, mark the payment as paid in our database
    if (paymentId) {
      const result = await query(`
        UPDATE payments SET 
          payment_status = 'paid',
          paid_date = NOW(),
          stripe_payment_intent_id = $1,
          stripe_charge_id = $2,
          updated_at = NOW()
        WHERE id = $3 AND payment_status != 'paid'
        RETURNING *
      `, [
        paymentIntent.id,
        paymentIntent.latest_charge,
        paymentId
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Payment not found or already processed'
        });
      }

      // Update player payment status if this was a monthly fee
      const payment = result.rows[0];
      if (payment.payment_type === 'monthly_fee') {
        await query(`
          UPDATE players SET 
            payment_status = 'paid',
            updated_at = NOW()
          WHERE id = $1
        `, [payment.player_id]);
      }

      console.log(`✅ Payment confirmed: ${paymentId} - Stripe: ${paymentIntent.id}`);
    }

    res.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount_received: paymentIntent.amount_received
      }
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      error: 'Failed to confirm payment',
      message: error.message
    });
  }
});

// 🔥 FIXED: PUBLIC PAYMENT DETAILS (for payment page)
router.get('/public/:id', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        error: 'Payment token is required'
      });
    }

    // Verify token
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [paymentId, timestamp] = decoded.split(':');
      
      if (paymentId !== req.params.id) {
        throw new Error('Invalid token');
      }
    } catch (error) {
      return res.status(403).json({
        error: 'Invalid payment token'
      });
    }

    const paymentResult = await query(`
      SELECT p.*, pl.first_name, pl.last_name, c.name as club_name, c.location
      FROM payments p
      JOIN players pl ON p.player_id = pl.id
      JOIN clubs c ON p.club_id = c.id
      WHERE p.id = $1
    `, [req.params.id]);
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Payment not found'
      });
    }

    const payment = paymentResult.rows[0];

    if (payment.payment_status === 'paid') {
      return res.status(400).json({
        error: 'Payment already completed'
      });
    }

    res.json({
      id: payment.id,
      amount: payment.amount,
      description: payment.description,
      dueDate: payment.due_date,
      paymentType: payment.payment_type,
      player: {
        name: `${payment.first_name} ${payment.last_name}`
      },
      club: {
        name: payment.club_name,
        location: payment.location
      }
    });

  } catch (error) {
    console.error('Get public payment error:', error);
    res.status(500).json({
      error: 'Failed to fetch payment details'
    });
  }
});

// 🔥 NEW: GENERATE PAYMENT LINK WITH PROPER TOKEN
router.get('/:id/payment-link', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const paymentResult = await query(`
      SELECT p.*, c.owner_id, pl.first_name, pl.last_name, pl.email
      FROM payments p
      JOIN clubs c ON p.club_id = c.id
      JOIN players pl ON p.player_id = pl.id
      WHERE p.id = $1
    `, [req.params.id]);
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Payment not found'
      });
    }

    const payment = paymentResult.rows[0];

    // Check if user owns the club
    if (payment.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    if (payment.payment_status === 'paid') {
      return res.status(400).json({
        error: 'Payment already completed'
      });
    }

    // Generate secure payment token
    const paymentToken = Buffer.from(`${payment.id}:${payment.created_at}`).toString('base64');
    
    // 🔥 FIXED: Use your actual domain
    const baseUrl = process.env.BASE_URL || 'https://clubhubsports.net';
    const paymentLink = `${baseUrl}/payment.html?id=${payment.id}&token=${paymentToken}`;

    res.json({
      paymentLink,
      player: {
        name: `${payment.first_name} ${payment.last_name}`,
        email: payment.email
      },
      payment: {
        amount: payment.amount,
        description: payment.description,
        dueDate: payment.due_date
      }
    });

  } catch (error) {
    console.error('Generate payment link error:', error);
    res.status(500).json({
      error: 'Failed to generate payment link'
    });
  }
});

// 🔥 NEW: BOOK EVENT WITH PAYMENT
router.post('/book-event', authenticateToken, async (req, res) => {
  try {
    const { eventId, paymentIntentId, playerData } = req.body;

    if (!eventId) {
      return res.status(400).json({
        error: 'Event ID is required'
      });
    }

    // Get event details
    const eventResult = await query(`
      SELECT e.*, c.name as club_name
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    const event = eventResult.rows[0];

    // Check if event requires payment and payment was provided
    if (event.price > 0 && !paymentIntentId) {
      return res.status(400).json({
        error: 'Payment required for this event'
      });
    }

    // Verify payment if provided
    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          error: 'Payment not completed'
        });
      }

      // Verify amount matches
      const expectedAmount = Math.round(event.price * 100);
      if (paymentIntent.amount !== expectedAmount) {
        return res.status(400).json({
          error: 'Payment amount mismatch'
        });
      }
    }

    // Check if user already booked this event
    const existingBooking = await query(`
      SELECT id FROM event_bookings
      WHERE event_id = $1 AND user_id = $2
    `, [eventId, req.user.id]);

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
    `, [eventId]);

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
        } else if (event.club_id) {
          // Create new player
          const newPlayer = await client.query(`
            INSERT INTO players (first_name, last_name, email, phone, date_of_birth, club_id, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `, [firstName, lastName, email, phone, dateOfBirth, event.club_id, req.user.id]);
          
          playerId = newPlayer.rows[0].id;
        }
      }

      // Create booking
      const bookingResult = await client.query(`
        INSERT INTO event_bookings (event_id, user_id, player_id, amount_paid, stripe_payment_intent_id, booking_status)
        VALUES ($1, $2, $3, $4, $5, 'confirmed')
        RETURNING *
      `, [eventId, req.user.id, playerId, event.price || 0, paymentIntentId]);

      // Update spots available
      if (event.capacity) {
        await client.query(`
          UPDATE events 
          SET spots_available = capacity - (
            SELECT COUNT(*) FROM event_bookings 
            WHERE event_id = $1 AND booking_status = 'confirmed'
          )
          WHERE id = $1
        `, [eventId]);
      }

      return bookingResult.rows[0];
    });

    console.log(`📅 Event booked: ${event.title} by user ${req.user.id}`);

    res.status(201).json({
      message: 'Event booked successfully',
      booking: booking,
      event: {
        title: event.title,
        date: event.event_date,
        price: event.price
      }
    });

  } catch (error) {
    console.error('Book event error:', error);
    res.status(500).json({
      error: 'Failed to book event',
      message: 'An error occurred while booking the event'
    });
  }
});

// Create new payment
router.post('/', authenticateToken, requireOrganization, paymentValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { 
      playerId, 
      amount, 
      paymentType, 
      description, 
      dueDate 
    } = req.body;

    // Verify player exists and belongs to user's club
    const playerResult = await query(`
      SELECT p.*, c.owner_id 
      FROM players p
      JOIN clubs c ON p.club_id = c.id
      WHERE p.id = $1
    `, [playerId]);

    if (playerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'The specified player does not exist'
      });
    }

    const player = playerResult.rows[0];

    if (player.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only create payments for players in your own clubs'
      });
    }

    const result = await query(`
      INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      playerId,
      player.club_id,
      amount,
      paymentType,
      description,
      dueDate
    ]);

    const newPayment = result.rows[0];

    console.log(`💰 Payment created: ${description} - £${amount} for player ${playerId}`);

    res.status(201).json({
      message: 'Payment created successfully',
      payment: newPayment
    });

  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      error: 'Failed to create payment',
      message: 'An error occurred while creating the payment'
    });
  }
});

// Mark payment as paid manually
router.patch('/:id/mark-paid', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const { notes } = req.body;

    // Get payment details and verify permissions
    const paymentResult = await query(`
      SELECT p.*, c.owner_id, pl.first_name, pl.last_name
      FROM payments p
      JOIN clubs c ON p.club_id = c.id
      JOIN players pl ON p.player_id = pl.id
      WHERE p.id = $1
    `, [req.params.id]);
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Payment not found'
      });
    }

    const payment = paymentResult.rows[0];

    // Check if user owns the club
    if (payment.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    if (payment.payment_status === 'paid') {
      return res.status(400).json({
        error: 'Payment already marked as paid'
      });
    }

    // Update payment status
    const result = await query(`
      UPDATE payments SET 
        payment_status = 'paid',
        paid_date = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);

    // Update player payment status if this was a monthly fee
    if (payment.payment_type === 'monthly_fee') {
      await query(`
        UPDATE players SET 
          payment_status = 'paid',
          updated_at = NOW()
        WHERE id = $1
      `, [payment.player_id]);
    }

    console.log(`💰 Payment manually marked as paid: ${payment.first_name} ${payment.last_name} - £${payment.amount}`);

    res.json({
      message: 'Payment marked as paid successfully',
      payment: result.rows[0]
    });

  } catch (error) {
    console.error('Mark payment as paid error:', error);
    res.status(500).json({
      error: 'Failed to mark payment as paid'
    });
  }
});

// Send payment reminder
router.post('/:id/send-reminder', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const paymentResult = await query(`
      SELECT p.*, c.owner_id, c.name as club_name, pl.first_name, pl.last_name, pl.email
      FROM payments p
      JOIN clubs c ON p.club_id = c.id
      JOIN players pl ON p.player_id = pl.id
      WHERE p.id = $1
    `, [req.params.id]);
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Payment not found'
      });
    }

    const payment = paymentResult.rows[0];

    // Check if user owns the club
    if (payment.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    if (payment.payment_status === 'paid') {
      return res.status(400).json({
        error: 'Cannot send reminder for paid payment'
      });
    }

    // Generate payment link for the reminder
    const paymentToken = Buffer.from(`${payment.id}:${payment.created_at}`).toString('base64');
    const baseUrl = process.env.BASE_URL || 'https://clubhubsports.net';
    const paymentLink = `${baseUrl}/payment.html?id=${payment.id}&token=${paymentToken}`;

    // In a real application, you would send an actual email here
    console.log(`📧 Payment reminder would be sent to: ${payment.email}`);
    console.log(`📄 Payment details: ${payment.description} - £${payment.amount}`);
    console.log(`🔗 Payment link: ${paymentLink}`);

    res.json({
      message: 'Payment reminder sent successfully',
      sentTo: payment.email,
      paymentLink: paymentLink
    });

  } catch (error) {
    console.error('Send payment reminder error:', error);
    res.status(500).json({
      error: 'Failed to send payment reminder'
    });
  }
});

module.exports = router;