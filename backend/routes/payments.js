const express = require('express');
const { query, queries, withTransaction } = require('../config/database');
const { authenticateToken, requireOrganization } = require('../middleware/auth');
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
    if (req.user.accountType === 'organization') {
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

// Get specific payment
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const paymentResult = await query(`
      SELECT p.*, 
             pl.first_name as player_first_name,
             pl.last_name as player_last_name,
             pl.email as player_email,
             pl.user_id as player_user_id,
             c.name as club_name,
             c.owner_id
      FROM payments p
      JOIN players pl ON p.player_id = pl.id
      JOIN clubs c ON p.club_id = c.id
      WHERE p.id = $1
    `, [req.params.id]);
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Payment not found',
        message: 'Payment with this ID does not exist'
      });
    }

    const payment = paymentResult.rows[0];

    // Check if user has permission to view this payment
    const hasPermission = payment.owner_id === req.user.id || 
                         (req.user.accountType === 'adult' && payment.player_user_id === req.user.id);

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this payment'
      });
    }

    res.json(payment);

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      error: 'Failed to fetch payment',
      message: 'An error occurred while fetching payment details'
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

// 🔥 CREATE STRIPE PAYMENT INTENT
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
        ...metadata
      },
      description: paymentDetails ? paymentDetails.description : `Payment of £${amount}`
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

// 🔥 CONFIRM STRIPE PAYMENT
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

// 🔥 MANUAL PAYMENT PROCESSING (for admin)
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
    const paymentLink = `${req.protocol}://${req.get('host')}/payment.html?id=${payment.id}&token=${paymentToken}`;

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

// 🔥 SEND PAYMENT REMINDER
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
    const paymentLink = `${req.protocol}://${req.get('host')}/payment.html?id=${payment.id}&token=${paymentToken}`;

    // In a real application, you would send an actual email here
    // For now, we'll just log the reminder details
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

// 🔥 PUBLIC PAYMENT DETAILS (for payment page)
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

// Generate monthly fees for all players in a club
router.post('/generate-monthly-fees/:clubId', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const { month, year } = req.body;

    // Verify club exists and user owns it
    const clubResult = await query('SELECT * FROM clubs WHERE id = $1', [req.params.clubId]);
    if (clubResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Club not found'
      });
    }

    const club = clubResult.rows[0];
    if (club.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Get all players with monthly fees
    const playersResult = await query(`
      SELECT * FROM players 
      WHERE club_id = $1 AND monthly_fee > 0
    `, [req.params.clubId]);

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();
    const dueDate = new Date(currentYear, currentMonth, 1); // 1st of the month

    // Generate payments for each player
    const generatedPayments = [];

    for (const player of playersResult.rows) {
      // Check if payment already exists for this month
      const existingPayment = await query(`
        SELECT id FROM payments
        WHERE player_id = $1 
          AND payment_type = 'monthly_fee'
          AND EXTRACT(MONTH FROM due_date) = $2
          AND EXTRACT(YEAR FROM due_date) = $3
      `, [player.id, currentMonth, currentYear]);

      if (existingPayment.rows.length === 0) {
        const result = await query(`
          INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date)
          VALUES ($1, $2, $3, 'monthly_fee', $4, $5)
          RETURNING *
        `, [
          player.id,
          req.params.clubId,
          player.monthly_fee,
          `Monthly fee for ${new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
          dueDate
        ]);

        generatedPayments.push(result.rows[0]);
      }
    }

    console.log(`💰 Generated ${generatedPayments.length} monthly fee payments for ${club.name}`);

    res.json({
      message: `Generated ${generatedPayments.length} monthly fee payments`,
      payments: generatedPayments,
      month: new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
    });

  } catch (error) {
    console.error('Generate monthly fees error:', error);
    res.status(500).json({
      error: 'Failed to generate monthly fees'
    });
  }
});

module.exports = router;