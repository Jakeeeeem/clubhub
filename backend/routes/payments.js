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

// 🔥 CREATE STRIPE PAYMENT INTENT
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, paymentId, metadata = {} } = req.body;

    // Validate Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return res.status(500).json({
        error: 'Payment system not configured',
        message: 'Please contact support - payment system unavailable'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    // Check minimum amount for GBP (30p)
    if (amount < 0.30) {
      return res.status(400).json({
        error: 'Amount too small',
        message: 'Minimum payment amount is £0.30'
      });
    }

    let paymentDetails = null;
    if (paymentId) {
      try {
        const paymentResult = await query(`
          SELECT p.*, pl.first_name, pl.last_name, pl.email, c.name as club_name
          FROM payments p
          JOIN players pl ON p.player_id = pl.id
          JOIN clubs c ON p.club_id = c.id
          WHERE p.id = $1
        `, [paymentId]);
        
        if (paymentResult.rows.length === 0) {
          return res.status(404).json({
            error: 'Payment not found',
            message: 'The payment record could not be found'
          });
        }

        paymentDetails = paymentResult.rows[0];
        
        // Check if already paid
        if (paymentDetails.payment_status === 'paid') {
          return res.status(400).json({
            error: 'Payment already completed',
            message: 'This payment has already been processed'
          });
        }
      } catch (dbError) {
        console.error('❌ Database error fetching payment:', dbError);
        return res.status(500).json({
          error: 'Database error',
          message: 'Unable to fetch payment details'
        });
      }
    }

    // Create Stripe Payment Intent
    try {
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
          timestamp: new Date().toISOString(),
          ...metadata
        },
        description: paymentDetails ? paymentDetails.description : `ClubHub Payment of £${amount}`,
        statement_descriptor: 'CLUBHUB*',
        receipt_email: paymentDetails ? paymentDetails.email : metadata.email
      });

      console.log(`💳 Stripe Payment Intent created: ${paymentIntent.id} for £${amount}`);

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amount,
        paymentDetails: paymentDetails
      });

    } catch (stripeError) {
      console.error('❌ Stripe API error:', stripeError);
      
      if (stripeError.code === 'api_key_invalid') {
        return res.status(500).json({
          error: 'Payment system configuration error',
          message: 'Please contact support - invalid API configuration'
        });
      }
      
      if (stripeError.code === 'rate_limit') {
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Please wait a moment and try again'
        });
      }

      return res.status(500).json({
        error: 'Payment system error',
        message: 'Unable to create payment intent. Please try again.'
      });
    }

  } catch (error) {
    console.error('❌ Create payment intent error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.'
    });
  }
});

// 🔥 CONFIRM STRIPE PAYMENT
router.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId, paymentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: 'Payment Intent ID is required'
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: 'Payment system not configured'
      });
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (stripeError) {
      console.error('❌ Failed to retrieve payment intent:', stripeError);
      return res.status(400).json({
        error: 'Invalid payment intent',
        message: 'Could not verify payment with Stripe'
      });
    }

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'Payment not completed',
        message: `Payment status: ${paymentIntent.status}`,
        status: paymentIntent.status
      });
    }

    // If paymentId provided, update our database
    if (paymentId) {
      try {
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

        const payment = result.rows[0];
        
        // Update player payment status if this was a monthly fee
        if (payment.payment_type === 'monthly_fee') {
          await query(`
            UPDATE players SET 
              payment_status = 'paid',
              updated_at = NOW()
            WHERE id = $1
          `, [payment.player_id]);
        }

        console.log(`✅ Payment confirmed: ${paymentId} - Stripe: ${paymentIntent.id}`);
      } catch (dbError) {
        console.error('❌ Database error updating payment:', dbError);
        return res.status(500).json({
          error: 'Database error',
          message: 'Payment was processed but could not update records'
        });
      }
    }

    res.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount_received: paymentIntent.amount_received / 100
      }
    });

  } catch (error) {
    console.error('❌ Confirm payment error:', error);
    res.status(500).json({
      error: 'Failed to confirm payment',
      message: 'An unexpected error occurred'
    });
  }
});

// 🔥 PUBLIC PAYMENT DETAILS (for payment page)
router.get('/public/:id', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        error: 'Payment token is required'
      });
    }

    // Verify token format and decode
    let paymentId, timestamp;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      [paymentId, timestamp] = decoded.split(':');
      
      if (!paymentId || !timestamp) {
        throw new Error('Invalid token format');
      }
      
      if (paymentId !== req.params.id) {
        throw new Error('Token mismatch');
      }
    } catch (tokenError) {
      return res.status(403).json({
        error: 'Invalid payment token',
        message: 'The payment link is invalid or has been tampered with'
      });
    }

    try {
      const paymentResult = await query(`
        SELECT p.*, pl.first_name, pl.last_name, c.name as club_name, c.location
        FROM payments p
        JOIN players pl ON p.player_id = pl.id
        JOIN clubs c ON p.club_id = c.id
        WHERE p.id = $1
      `, [req.params.id]);
      
      if (paymentResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Payment not found',
          message: 'This payment record does not exist'
        });
      }

      const payment = paymentResult.rows[0];

      if (payment.payment_status === 'paid') {
        return res.status(400).json({
          error: 'Payment already completed',
          message: 'This payment has already been processed',
          paidDate: payment.paid_date
        });
      }

      const isOverdue = new Date() > new Date(payment.due_date);

      res.json({
        id: payment.id,
        amount: payment.amount,
        description: payment.description,
        dueDate: payment.due_date,
        paymentType: payment.payment_type,
        isOverdue,
        player: {
          name: `${payment.first_name} ${payment.last_name}`
        },
        club: {
          name: payment.club_name,
          location: payment.location
        }
      });

    } catch (dbError) {
      console.error('❌ Database error fetching public payment:', dbError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Unable to fetch payment details'
      });
    }

  } catch (error) {
    console.error('❌ Get public payment error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// 🔥 GENERATE PAYMENT LINK
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

    const paymentToken = Buffer.from(`${payment.id}:${payment.created_at}`).toString('base64');
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

// 🔥 BOOK EVENT WITH PAYMENT
router.post('/book-event', authenticateToken, async (req, res) => {
  try {
    const { eventId, paymentIntentId, playerData } = req.body;

    if (!eventId) {
      return res.status(400).json({
        error: 'Event ID is required'
      });
    }

    const eventResult = await query(`
      SELECT e.*, c.name as club_name, c.owner_id
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Event not found',
        message: 'The specified event does not exist'
      });
    }

    const event = eventResult.rows[0];

    if (event.price > 0 && !paymentIntentId) {
      return res.status(400).json({
        error: 'Payment required',
        message: `This event costs £${event.price}. Payment is required to book.`
      });
    }

    // Verify payment if provided
    if (paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== 'succeeded') {
          return res.status(400).json({
            error: 'Payment not completed',
            message: `Payment status: ${paymentIntent.status}`
          });
        }

        const expectedAmount = Math.round(event.price * 100);
        if (paymentIntent.amount !== expectedAmount) {
          return res.status(400).json({
            error: 'Payment amount mismatch',
            message: `Expected £${event.price}, but received £${paymentIntent.amount / 100}`
          });
        }
      } catch (stripeError) {
        console.error('❌ Stripe verification error:', stripeError);
        return res.status(400).json({
          error: 'Payment verification failed',
          message: 'Could not verify payment with Stripe'
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

    // Create booking in transaction
    const booking = await withTransaction(async (client) => {
      let playerId = null;

      if (playerData) {
        const { firstName, lastName, email, phone, dateOfBirth } = playerData;
        
        const existingPlayer = await client.query(`
          SELECT id FROM players 
          WHERE email = $1 AND club_id = $2
        `, [email, event.club_id]);

        if (existingPlayer.rows.length > 0) {
          playerId = existingPlayer.rows[0].id;
        } else if (event.club_id) {
          const newPlayer = await client.query(`
            INSERT INTO players (first_name, last_name, email, phone, date_of_birth, club_id, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `, [firstName, lastName, email, phone, dateOfBirth, event.club_id, req.user.id]);
          
          playerId = newPlayer.rows[0].id;
        }
      }

      const bookingResult = await client.query(`
        INSERT INTO event_bookings (event_id, user_id, player_id, amount_paid, stripe_payment_intent_id, booking_status)
        VALUES ($1, $2, $3, $4, $5, 'confirmed')
        RETURNING *
      `, [eventId, req.user.id, playerId, event.price || 0, paymentIntentId]);

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

    const { playerId, amount, paymentType, description, dueDate } = req.body;

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
    `, [playerId, player.club_id, amount, paymentType, description, dueDate]);

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

module.exports = router;