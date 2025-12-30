const { query, withTransaction } = require('../config/database');

async function processRecurringPayments() {
  console.log('🔄 Processing recurring payments...');
  
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    // Find due plans
    const duePlans = await query(`
      SELECT pp.*, p.name as plan_name, p.price, p.interval, u.email, pl.club_id
      FROM player_plans pp
      JOIN plans p ON pp.plan_id = p.id
      JOIN users u ON pp.user_id = u.id
      LEFT JOIN players pl ON pl.user_id = u.id
      WHERE pp.is_active = true 
      AND (pp.next_billing_date <= $1 OR pp.next_billing_date IS NULL)
    `, [today]);

    console.log(`Found ${duePlans.rows.length} plans due for billing.`);

    for (const plan of duePlans.rows) {
      await withTransaction(async (client) => {
        // 1. Create payment record
        await client.query(`
          INSERT INTO payments (player_id, club_id, amount, payment_type, description, due_date, payment_status)
          SELECT id, $2, $3, 'monthly_fee', $4, $5, 'pending'
          FROM players WHERE user_id = $1
          LIMIT 1
        `, [
          plan.user_id, 
          plan.club_id, 
          plan.price, 
          `Monthly fee for ${plan.plan_name}`, 
          today
        ]);

        // 2. Calculate next billing date
        const nextBilling = new Date(plan.next_billing_date || today);
        if (plan.interval === 'month') nextBilling.setMonth(nextBilling.getMonth() + 1);
        else if (plan.interval === 'week') nextBilling.setDate(nextBilling.getDate() + 7);
        else if (plan.interval === 'year') nextBilling.setFullYear(nextBilling.getFullYear() + 1);

        // 3. Update player_plan record
        await client.query(`
          UPDATE player_plans 
          SET last_billing_date = $1, next_billing_date = $2, updated_at = NOW()
          WHERE id = $3
        `, [today, nextBilling.toISOString().slice(0, 10), plan.id]);

        // 4. Create notification
        await client.query(`
          INSERT INTO notifications (user_id, title, message, notification_type, action_url)
          VALUES ($1, $2, $3, 'payment', '/player-dashboard.html?tab=finances')
        `, [
          plan.user_id,
          'New Payment Due',
          `A new payment of ${plan.price} is due for your ${plan.plan_name} plan.`
        ]);
      });
      
      console.log(`✅ Processed billing for user ${plan.user_id} (${plan.plan_name})`);
    }

  } catch (error) {
    console.error('❌ Error processing recurring payments:', error);
  }
}

// Simple scheduler: check every 12 hours
function startBillingScheduler() {
  processRecurringPayments(); // Run once on start
  setInterval(processRecurringPayments, 1000 * 60 * 60 * 12);
}

module.exports = {
  processRecurringPayments,
  startBillingScheduler
};
