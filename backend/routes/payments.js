const express = require('express');
const { query, queries, withTransaction } = require('../config/database');
const { authenticateToken, requireOrganization, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const router = express.Router();

// Enable CORS for payment routes
router.use(cors({
    origin: [
        'https://clubhubsports.net',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8080',
        'http://127.0.0.1:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
router.options('*', cors());

// Validation rules
const paymentValidation = [
  body('playerId').optional().isUUID().withMessage('Valid player ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('paymentType').optional().isIn(['monthly_fee', 'event_booking', 'registration', 'equipment']).withMessage('Invalid payment type'),
  body('description').optional().trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('dueDate').optional().isISO8601().withMessage('Please provide a valid due date')
];

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    stripe: !!process.env.STRIPE_SECRET_KEY,
    timestamp: new Date().toISOString()
  });
});

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
      LEFT JOIN players pl ON p.player_id = pl.id
      LEFT JOIN clubs c ON p.club_id = c.id
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

// 🔥 CREATE STRIPE PAYMENT INTENT - ENHANCED
router.post('/create-intent', async (req, res) => {
  try {
    console.log('💳 Creating payment intent with data:', req.body);
    
    const { amount, paymentId, metadata = {} } = req.body;

    // Validate Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return res.status(500).json({
        error: 'Payment system not configured',
        message: 'Please contact support - payment system unavailable',
        details: 'Stripe secret key missing'
      });
    }

    // Validate amount
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number',
        received: amount
      });
    }

    const numericAmount = parseFloat(amount);

    // Check minimum amount for GBP (30p)
    if (numericAmount < 0.30) {
      return res.status(400).json({
        error: 'Amount too small',
        message: 'Minimum payment amount is £0.30',
        received: numericAmount
      });
    }

    // Check maximum amount (£999,999.99)
    if (numericAmount > 999999.99) {
      return res.status(400).json({
        error: 'Amount too large',
        message: 'Maximum payment amount is £999,999.99',
        received: numericAmount
      });
    }

    let paymentDetails = null;
    
    // Fetch payment details if paymentId is provided
    if (paymentId && paymentId !== `direct_${paymentId}` && !paymentId.startsWith('direct_')) {
      try {
        const paymentResult = await query(`
          SELECT p.*, pl.first_name, pl.last_name, pl.email, c.name as club_name
          FROM payments p
          LEFT JOIN players pl ON p.player_id = pl.id
          LEFT JOIN clubs c ON p.club_id = c.id
          WHERE p.id = $1
        `, [paymentId]);
        
        if (paymentResult.rows.length > 0) {
          paymentDetails = paymentResult.rows[0];
          
          // Check if already paid
          if (paymentDetails.payment_status === 'paid') {
            return res.status(400).json({
              error: 'Payment already completed',
              message: 'This payment has already been processed',
              paymentStatus: 'paid'
            });
          }
        } else {
          console.warn(`⚠️ Payment record not found for ID: ${paymentId}`);
        }
      } catch (dbError) {
        console.error('❌ Database error fetching payment:', dbError);
        // Don't fail here - continue with direct payment
        console.warn('⚠️ Continuing with direct payment due to database error');
      }
    }

    // Create Stripe Payment Intent
    try {
  const paymentIntentData = {
    amount: Math.round(numericAmount * 100), // Convert to pence
    currency: 'gbp',
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      paymentId: paymentId || 'direct_payment',
      playerName: paymentDetails ? `${paymentDetails.first_name} ${paymentDetails.last_name}` : metadata.playerName || 'Customer',
      clubName: paymentDetails ? paymentDetails.club_name : metadata.clubName || 'ClubHub',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      source: 'clubhub_payment_page',
      ...metadata
    },
    description: paymentDetails ? paymentDetails.description : metadata.description || `ClubHub Payment of £${numericAmount}`,
    statement_descriptor_suffix: 'CLUBHUB', // ✅ FIXED!
  };

      // Add receipt email if available
      const email = paymentDetails?.email || metadata.email;
      if (email && email.includes('@')) {
        paymentIntentData.receipt_email = email;
      }

      console.log('💳 Creating Stripe PaymentIntent with data:', {
        amount: paymentIntentData.amount,
        currency: paymentIntentData.currency,
        description: paymentIntentData.description
      });

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

      console.log(`✅ Stripe Payment Intent created: ${paymentIntent.id} for £${numericAmount}`);

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: numericAmount,
        currency: 'gbp',
        paymentDetails: paymentDetails,
        metadata: paymentIntentData.metadata
      });

    } catch (stripeError) {
      console.error('❌ Stripe API error:', stripeError);
      
      let errorMessage = 'Unable to create payment intent. Please try again.';
      let statusCode = 500;
      
      if (stripeError.code === 'api_key_invalid') {
        errorMessage = 'Payment system configuration error. Please contact support.';
        statusCode = 500;
      } else if (stripeError.code === 'rate_limit') {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
        statusCode = 429;
      } else if (stripeError.code === 'amount_too_small') {
        errorMessage = 'Payment amount is too small. Minimum is £0.30.';
        statusCode = 400;
      } else if (stripeError.code === 'amount_too_large') {
        errorMessage = 'Payment amount is too large. Maximum is £999,999.99.';
        statusCode = 400;
      }

      return res.status(statusCode).json({
        error: 'Payment system error',
        message: errorMessage,
        code: stripeError.code,
        type: stripeError.type
      });
    }

  } catch (error) {
    console.error('❌ Create payment intent error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🔥 CONFIRM STRIPE PAYMENT - ENHANCED
router.post('/confirm-payment', async (req, res) => {
  try {
    console.log('✅ Confirming payment with data:', req.body);
    
    const { paymentIntentId, paymentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: 'Payment Intent ID is required',
        message: 'Missing paymentIntentId parameter'
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: 'Payment system not configured',
        message: 'Stripe not configured on server'
      });
    }

    // Retrieve and verify payment intent from Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      console.log(`💳 Retrieved PaymentIntent ${paymentIntentId} with status: ${paymentIntent.status}`);
    } catch (stripeError) {
      console.error('❌ Failed to retrieve payment intent:', stripeError);
      return res.status(400).json({
        error: 'Invalid payment intent',
        message: 'Could not verify payment with Stripe',
        code: stripeError.code
      });
    }

    if (paymentIntent.status !== 'succeeded') {
      console.warn(`⚠️ Payment intent status is ${paymentIntent.status}, not succeeded`);
      return res.status(400).json({
        error: 'Payment not completed',
        message: `Payment status: ${paymentIntent.status}`,
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action'
      });
    }

    // If paymentId provided, update our database
    if (paymentId && !paymentId.startsWith('direct_')) {
      try {
        console.log(`📝 Updating payment record ${paymentId} in database`);
        
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
          console.warn(`⚠️ Payment record ${paymentId} not found or already processed`);
          // Don't fail here - payment succeeded on Stripe side
        } else {
          const payment = result.rows[0];
          console.log(`✅ Updated payment record: ${payment.id}`);
          
          // Update player payment status if this was a monthly fee
          if (payment.payment_type === 'monthly_fee' && payment.player_id) {
            try {
              await query(`
                UPDATE players SET 
                  payment_status = 'paid',
                  updated_at = NOW()
                WHERE id = $1
              `, [payment.player_id]);
              console.log(`✅ Updated player payment status for player: ${payment.player_id}`);
            } catch (playerError) {
              console.error('❌ Failed to update player status:', playerError);
              // Don't fail the whole request
            }
          }
        }
      } catch (dbError) {
        console.error('❌ Database error updating payment:', dbError);
        // Don't fail here - payment succeeded on Stripe side
        console.warn('⚠️ Payment succeeded on Stripe but database update failed');
      }
    } else {
      console.log('📝 Direct payment - no database record to update');
    }

    // Return success response
    const response = {
      success: true,
      message: 'Payment confirmed successfully',
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount_received: paymentIntent.amount_received / 100,
        currency: paymentIntent.currency,
        created: paymentIntent.created,
        metadata: paymentIntent.metadata
      }
    };

    console.log(`✅ Payment confirmation successful: ${paymentIntent.id}`);
    res.json(response);

  } catch (error) {
    console.error('❌ Confirm payment error:', error);
    res.status(500).json({
      error: 'Failed to confirm payment',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🔥 PUBLIC PAYMENT DETAILS - ENHANCED (for payment page)
router.get('/public/:id', async (req, res) => {
  try {
    const { token } = req.query;
    const paymentId = req.params.id;
    
    console.log(`🔍 Fetching public payment details for ID: ${paymentId}`);

    // If no token provided, this might be a direct payment
    if (!token) {
      console.log('⚠️ No token provided - treating as direct payment');
      return res.status(400).json({
        error: 'Payment token required',
        message: 'This payment requires a valid token for security'
      });
    }

    // Verify token format and decode
    let decodedPaymentId, timestamp;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      [decodedPaymentId, timestamp] = decoded.split(':');
      
      if (!decodedPaymentId || !timestamp) {
        throw new Error('Invalid token format');
      }
      
      if (decodedPaymentId !== paymentId) {
        throw new Error('Token mismatch');
      }
    } catch (tokenError) {
      console.error('❌ Token verification failed:', tokenError);
      return res.status(403).json({
        error: 'Invalid payment token',
        message: 'The payment link is invalid or has been tampered with'
      });
    }

    // Fetch payment details from database
    try {
      const paymentResult = await query(`
        SELECT p.*, pl.first_name, pl.last_name, pl.email, c.name as club_name, c.location
        FROM payments p
        LEFT JOIN players pl ON p.player_id = pl.id
        LEFT JOIN clubs c ON p.club_id = c.id
        WHERE p.id = $1
      `, [paymentId]);
      
      if (paymentResult.rows.length === 0) {
        console.warn(`⚠️ Payment not found: ${paymentId}`);
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

      const response = {
        id: payment.id,
        amount: payment.amount,
        description: payment.description,
        dueDate: payment.due_date,
        paymentType: payment.payment_type,
        isOverdue,
        player: {
          name: payment.first_name && payment.last_name 
            ? `${payment.first_name} ${payment.last_name}` 
            : 'N/A'
        },
        club: {
          name: payment.club_name || 'N/A',
          location: payment.location || 'N/A'
        }
      };

      console.log(`✅ Public payment details retrieved: ${paymentId}`);
      res.json(response);

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
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
});

// 🔥 GENERATE PAYMENT LINK - ENHANCED
router.get('/:id/payment-link', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const paymentId = req.params.id;
    
    const paymentResult = await query(`
      SELECT p.*, c.owner_id, pl.first_name, pl.last_name, pl.email
      FROM payments p
      LEFT JOIN clubs c ON p.club_id = c.id
      LEFT JOIN players pl ON p.player_id = pl.id
      WHERE p.id = $1
    `, [paymentId]);
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Payment not found',
        message: 'The specified payment does not exist'
      });
    }

    const payment = paymentResult.rows[0];

    // Check ownership
    if (payment.owner_id && payment.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only generate links for your own club payments'
      });
    }

    if (payment.payment_status === 'paid') {
      return res.status(400).json({
        error: 'Payment already completed',
        message: 'Cannot generate link for completed payment'
      });
    }

    // Generate secure token
    const paymentToken = Buffer.from(`${payment.id}:${payment.created_at || new Date().toISOString()}`).toString('base64');
    const baseUrl = process.env.BASE_URL || 'https://clubhubsports.net';
    const paymentLink = `${baseUrl}/payment.html?id=${payment.id}&token=${paymentToken}`;

    res.json({
      paymentLink,
      player: {
        name: payment.first_name && payment.last_name 
          ? `${payment.first_name} ${payment.last_name}` 
          : 'N/A',
        email: payment.email || 'N/A'
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
      error: 'Failed to generate payment link',
      message: 'An unexpected error occurred'
    });
  }
});

// 🔥 BOOK EVENT WITH PAYMENT - ENHANCED
router.post('/book-event', async (req, res) => {
  try {
    const { eventId, paymentIntentId, playerData } = req.body;

    if (!eventId) {
      return res.status(400).json({
        error: 'Event ID is required',
        message: 'Missing eventId parameter'
      });
    }

    // Fetch event details
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

    // Check if payment is required
    if (event.price > 0 && !paymentIntentId) {
      return res.status(400).json({
        error: 'Payment required',
        message: `This event costs £${event.price}. Payment is required to book.`,
        eventPrice: event.price
      });
    }

    // Verify payment if provided
    if (paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status !== 'succeeded') {
          return res.status(400).json({
            error: 'Payment not completed',
            message: `Payment status: ${paymentIntent.status}`,
            paymentStatus: paymentIntent.status
          });
        }

        const expectedAmount = Math.round(event.price * 100);
        if (paymentIntent.amount !== expectedAmount) {
          return res.status(400).json({
            error: 'Payment amount mismatch',
            message: `Expected £${event.price}, but received £${paymentIntent.amount / 100}`,
            expected: event.price,
            received: paymentIntent.amount / 100
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

    // Get user ID (if authenticated) or use guest
    const userId = req.user?.id || null;

    // Check if user already booked this event
    if (userId) {
      const existingBooking = await query(`
        SELECT id FROM event_bookings
        WHERE event_id = $1 AND user_id = $2
      `, [eventId, userId]);

      if (existingBooking.rows.length > 0) {
        return res.status(409).json({
          error: 'Already booked',
          message: 'You have already booked this event'
        });
      }
    }

    // Create booking in transaction
    const booking = await withTransaction(async (client) => {
      let playerId = null;

      // Handle player data if provided
      if (playerData && event.club_id) {
        const { firstName, lastName, email, phone, dateOfBirth } = playerData;
        
        // Check if player already exists
        const existingPlayer = await client.query(`
          SELECT id FROM players 
          WHERE email = $1 AND club_id = $2
        `, [email, event.club_id]);

        if (existingPlayer.rows.length > 0) {
          playerId = existingPlayer.rows[0].id;
        } else {
          // Create new player
          const newPlayer = await client.query(`
            INSERT INTO players (first_name, last_name, email, phone, date_of_birth, club_id, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `, [firstName, lastName, email, phone, dateOfBirth, event.club_id, userId]);
          
          playerId = newPlayer.rows[0].id;
        }
      }

      // Create booking record
      const bookingResult = await client.query(`
        INSERT INTO event_bookings (event_id, user_id, player_id, amount_paid, stripe_payment_intent_id, booking_status)
        VALUES ($1, $2, $3, $4, $5, 'confirmed')
        RETURNING *
      `, [eventId, userId, playerId, event.price || 0, paymentIntentId]);

      return bookingResult.rows[0];
    });

    console.log(`📅 Event booked: ${event.title} by user ${userId || 'guest'}`);

    res.status(201).json({
      success: true,
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

    // Fetch player details
    const playerResult = await query(`
      SELECT p.*, c.owner_id 
      FROM players p
      LEFT JOIN clubs c ON p.club_id = c.id
      WHERE p.id = $1
    `, [playerId]);

    if (playerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'The specified player does not exist'
      });
    }

    const player = playerResult.rows[0];

    // Check ownership
    if (player.owner_id && player.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only create payments for players in your own clubs'
      });
    }

    // Create payment record
    const result = await query(`
      INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, [playerId, player.club_id, amount, paymentType || 'general', description, dueDate]);

    const newPayment = result.rows[0];

    console.log(`💰 Payment created: ${description} - £${amount} for player ${playerId}`);

    res.status(201).json({
      success: true,
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

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Payment route error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred in payment processing'
  });
});



module.exports = router;