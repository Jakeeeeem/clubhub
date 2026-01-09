const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateToken, requireOrganization } = require('../middleware/auth');

/**
 * Configure payout schedule for a connected account
 * Sets payouts to monthly on the 1st of each month
 */
router.post('/configure-payout/:accountId', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const { accountId } = req.params;
    
    console.log(`📅 Configuring monthly payout schedule for account: ${accountId}`);
    
    // Update the account's payout schedule
    const account = await stripe.accounts.update(accountId, {
      settings: {
        payouts: {
          schedule: {
            interval: 'monthly',
            monthly_anchor: 1, // 1st of the month
            delay_days: 'minimum' // Minimum delay (usually 2 days for standard accounts)
          }
        }
      }
    });
    
    console.log(`✅ Payout schedule configured successfully for ${accountId}`);
    
    res.json({
      success: true,
      message: 'Payout schedule configured to monthly on the 1st',
      account: {
        id: account.id,
        payouts_enabled: account.payouts_enabled,
        payout_schedule: account.settings.payouts.schedule
      }
    });
    
  } catch (error) {
    console.error('❌ Error configuring payout schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get current payout schedule for a connected account
 */
router.get('/payout-schedule/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const account = await stripe.accounts.retrieve(accountId);
    
    res.json({
      success: true,
      account_id: account.id,
      payouts_enabled: account.payouts_enabled,
      payout_schedule: account.settings.payouts.schedule,
      default_currency: account.default_currency
    });
    
  } catch (error) {
    console.error('❌ Error retrieving payout schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Configure payout schedules for all connected accounts
 * Useful for bulk setup
 */
router.post('/configure-all-payouts', authenticateToken, requireOrganization, async (req, res) => {
  try {
    console.log('📅 Configuring monthly payouts for all connected accounts...');
    
    // List all connected accounts
    const accounts = await stripe.accounts.list({ limit: 100 });
    
    const results = [];
    
    for (const account of accounts.data) {
      try {
        await stripe.accounts.update(account.id, {
          settings: {
            payouts: {
              schedule: {
                interval: 'monthly',
                monthly_anchor: 1,
                delay_days: 'minimum'
              }
            }
          }
        });
        
        results.push({
          account_id: account.id,
          success: true,
          message: 'Configured successfully'
        });
        
        console.log(`✅ Configured payouts for ${account.id}`);
        
      } catch (error) {
        results.push({
          account_id: account.id,
          success: false,
          error: error.message
        });
        
        console.error(`❌ Failed to configure ${account.id}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      message: `Configured ${results.filter(r => r.success).length} of ${results.length} accounts`,
      results
    });
    
  } catch (error) {
    console.error('❌ Error configuring all payouts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Manually trigger a payout (for testing or special cases)
 */
router.post('/manual-payout/:accountId', authenticateToken, requireOrganization, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { amount, currency = 'gbp' } = req.body;
    
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
    }
    
    // Create a manual payout
    const payout = await stripe.payouts.create(
      {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency
      },
      {
        stripeAccount: accountId
      }
    );
    
    res.json({
      success: true,
      message: 'Manual payout created',
      payout: {
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        arrival_date: new Date(payout.arrival_date * 1000).toISOString(),
        status: payout.status
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating manual payout:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
