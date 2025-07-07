const express = require('express');
const { query, queries, withTransaction } = require('../config/database');
const { authenticateToken, requireOrganization } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

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
                         (req.user.accountType === 'adult' && payment.user_id === req.user.id);

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

// Update payment
router.put('/:id', authenticateToken, requireOrganization, paymentValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if payment exists and user has permission
    const paymentResult = await query(`
      SELECT p.*, c.owner_id 
      FROM payments p
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
    
    if (payment.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update payments for your own clubs'
      });
    }

    const { 
      amount, 
      paymentType, 
      description, 
      dueDate,
      paymentStatus
    } = req.body;

    const result = await query(`
      UPDATE payments SET 
        amount = $1,
        payment_type = $2,
        description = $3,
        due_date = $4,
        payment_status = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [
      amount,
      paymentType,
      description,
      dueDate,
      paymentStatus || payment.payment_status,
      req.params.id
    ]);

    const updatedPayment = result.rows[0];

    res.json({
      message: 'Payment updated successfully',
      payment: updatedPayment
    });

  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      error: 'Failed to update payment',
      message: 'An error occurred while updating the payment'
    });
  }
});

// Delete payment
router.delete('/:id', authenticateToken, requireOrganization, async (req, res) => {
  try {
    // Check if payment exists and user has permission
    const paymentResult = await query(`
      SELECT p.*, c.owner_id 
      FROM payments p
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
    
    if (payment.owner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete payments for your own clubs'
      });
    }

    // Don't allow deletion of paid payments
    if (payment.payment_status === 'paid') {
      return res.status(400).json({
        error: 'Cannot delete paid payment',
        message: 'Paid payments cannot be deleted'
      });
    }

    await query('DELETE FROM payments WHERE id = $1', [req.params.id]);

    res.json({
      message: 'Payment deleted successfully'
    });

  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      error: 'Failed to delete payment',
      message: 'An error occurred while deleting the payment'
    });
  }
});

// Mark payment as paid
router.patch('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const { stripePaymentIntentId, stripeChargeId } = req.body;

    // Get payment details
    const paymentResult = await query(`
      SELECT p.*, c.owner_id, pl.user_id 
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

    // Check if user has permission (club owner or player's user)
    const hasPermission = payment.owner_id === req.user.id || payment.user_id === req.user.id;

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    if (payment.payment_status === 'paid') {
      return res.status(400).json({
        error: 'Payment already paid',
        message: 'This payment has already been processed'
      });
    }

    // Update payment status
    const result = await query(`
      UPDATE payments SET 
        payment_status = 'paid',
        paid_date = NOW(),
        stripe_payment_intent_id = $1,
        stripe_charge_id = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [stripePaymentIntentId || null, stripeChargeId || null, req.params.id]);

    // Update player payment status if this was a monthly fee
    if (payment.payment_type === 'monthly_fee') {
      await query(`
        UPDATE players SET 
          payment_status = 'paid',
          updated_at = NOW()
        WHERE id = $1
      `, [payment.player_id]);
    }

    res.json({
      message: 'Payment processed successfully',
      payment: result.rows[0]
    });

  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({
      error: 'Failed to process payment'
    });
  }
});

// Get payment history for a player
router.get('/history/:playerId', authenticateToken, async (req, res) => {
  try {
    // Verify player exists and user has permission
    const playerResult = await query(`
      SELECT p.*, c.owner_id, p.user_id 
      FROM players p
      JOIN clubs c ON p.club_id = c.id
      WHERE p.id = $1
    `, [req.params.playerId]);

    if (playerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Player not found'
      });
    }

    const player = playerResult.rows[0];

    // Check if user has permission
    const hasPermission = player.owner_id === req.user.id || 
                         (req.user.accountType === 'adult' && player.user_id === req.user.id);

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Get payment history
    const paymentsResult = await query(`
      SELECT * FROM payments
      WHERE player_id = $1
      ORDER BY due_date DESC, created_at DESC
    `, [req.params.playerId]);

    // Calculate statistics
    const payments = paymentsResult.rows;
    const stats = {
      total_payments: payments.length,
      total_amount: payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      paid_count: payments.filter(p => p.payment_status === 'paid').length,
      pending_count: payments.filter(p => p.payment_status === 'pending').length,
      overdue_count: payments.filter(p => p.payment_status === 'overdue').length,
      total_paid: payments
        .filter(p => p.payment_status === 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0),
      total_outstanding: payments
        .filter(p => p.payment_status !== 'paid')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0)
    };

    res.json({
      player: {
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name
      },
      payments,
      statistics: stats
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      error: 'Failed to fetch payment history'
    });
  }
});

// Get club payment summary
router.get('/club/:clubId/summary', authenticateToken, requireOrganization, async (req, res) => {
  try {
    // Verify club exists and user owns it
    const clubResult = await query(queries.findClubById, [req.params.clubId]);
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

    // Get payment summary
    const summaryResult = await query(`
      SELECT 
        payment_status,
        payment_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM payments
      WHERE club_id = $1
      GROUP BY payment_status, payment_type
      ORDER BY payment_status, payment_type
    `, [req.params.clubId]);

    // Get overdue payments
    const overdueResult = await query(`
      SELECT p.*, pl.first_name, pl.last_name
      FROM payments p
      JOIN players pl ON p.player_id = pl.id
      WHERE p.club_id = $1 
        AND p.payment_status = 'pending' 
        AND p.due_date < CURRENT_DATE
      ORDER BY p.due_date ASC
    `, [req.params.clubId]);

    // Get recent payments
    const recentResult = await query(`
      SELECT p.*, pl.first_name, pl.last_name
      FROM payments p
      JOIN players pl ON p.player_id = pl.id
      WHERE p.club_id = $1 
        AND p.payment_status = 'paid'
      ORDER BY p.paid_date DESC
      LIMIT 10
    `, [req.params.clubId]);

    // Calculate totals
    const totals = summaryResult.rows.reduce((acc, row) => {
      acc.total_amount += parseFloat(row.total_amount);
      acc.total_count += parseInt(row.count);
      
      if (row.payment_status === 'paid') {
        acc.paid_amount += parseFloat(row.total_amount);
        acc.paid_count += parseInt(row.count);
      } else {
        acc.outstanding_amount += parseFloat(row.total_amount);
        acc.outstanding_count += parseInt(row.count);
      }
      
      return acc;
    }, {
      total_amount: 0,
      total_count: 0,
      paid_amount: 0,
      paid_count: 0,
      outstanding_amount: 0,
      outstanding_count: 0
    });

    res.json({
      club: {
        id: club.id,
        name: club.name
      },
      summary: summaryResult.rows,
      totals,
      overdue_payments: overdueResult.rows,
      recent_payments: recentResult.rows
    });

  } catch (error) {
    console.error('Get club payment summary error:', error);
    res.status(500).json({
      error: 'Failed to fetch payment summary'
    });
  }
});

// Create payment intent (for Stripe integration)
router.post('/create-intent', authenticateToken, [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // For now, return a mock payment intent
    // In production, you would integrate with Stripe here
    const { amount, currency = 'gbp', metadata = {} } = req.body;

    const mockPaymentIntent = {
      id: `pi_mock_${Date.now()}`,
      amount: Math.round(amount * 100), // Convert to pence/cents
      currency,
      status: 'requires_payment_method',
      client_secret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
      metadata
    };

    res.json({
      payment_intent: mockPaymentIntent
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      error: 'Failed to create payment intent'
    });
  }
});

// Confirm payment (for Stripe integration)
router.post('/confirm', authenticateToken, [
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { paymentIntentId } = req.body;

    // For now, return a mock confirmation
    // In production, you would confirm with Stripe here
    const mockConfirmation = {
      id: paymentIntentId,
      status: 'succeeded',
      amount_received: Math.round(Math.random() * 10000), // Mock amount
      charges: {
        data: [{
          id: `ch_mock_${Date.now()}`,
          status: 'succeeded'
        }]
      }
    };

    res.json({
      payment_intent: mockConfirmation
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      error: 'Failed to confirm payment'
    });
  }
});

// Generate monthly fees for all players in a club
router.post('/generate-monthly-fees/:clubId', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const { month, year } = req.body;

    // Verify club exists and user owns it
    const clubResult = await query(queries.findClubById, [req.params.clubId]);
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