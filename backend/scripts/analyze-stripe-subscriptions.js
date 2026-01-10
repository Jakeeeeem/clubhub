#!/usr/bin/env node

/**
 * Stripe-Based Payment Analysis
 * Analyzes payment dates directly from Stripe API
 * Can run locally - no database needed!
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function analyzeStripePayments() {
  console.log('💳 Stripe Payment Analysis');
  console.log('=' .repeat(80));
  console.log('');

  try {
    // Get all connected accounts
    console.log('📡 Fetching connected accounts from Stripe...');
    const accounts = await stripe.accounts.list({ limit: 100 });
    
    console.log(`✅ Found ${accounts.data.length} connected accounts`);
    console.log('');

    // Find Ardwick FC
    const ardwickAccount = accounts.data.find(acc => 
      acc.business_profile?.name?.toLowerCase().includes('ardwick') ||
      acc.email?.toLowerCase().includes('ardwick')
    );

    if (!ardwickAccount) {
      console.log('❌ Ardwick FC not found in Stripe connected accounts');
      console.log('');
      console.log('Available accounts:');
      accounts.data.forEach(acc => {
        console.log(`  - ${acc.business_profile?.name || acc.email || acc.id}`);
      });
      return;
    }

    console.log(`✅ Found: ${ardwickAccount.business_profile?.name || ardwickAccount.email}`);
    console.log(`   Account ID: ${ardwickAccount.id}`);
    console.log('');

    // Get all customers
    console.log('👥 Fetching customers...');
    const customers = await stripe.customers.list({ limit: 100 });
    console.log(`   Found ${customers.data.length} customers`);
    console.log('');

    // Analyze subscriptions
    console.log('💰 SUBSCRIPTION ANALYSIS');
    console.log('=' .repeat(80));
    console.log('');

    const subscriptions = await stripe.subscriptions.list({ 
      limit: 100,
      status: 'active'
    });

    console.log(`📊 Total Active Subscriptions: ${subscriptions.data.length}`);
    console.log('');

    if (subscriptions.data.length === 0) {
      console.log('⚠️  No active subscriptions found');
      return;
    }

    // Group by billing day
    const billingDays = {};
    const subscriptionDetails = [];

    for (const sub of subscriptions.data) {
      const customer = await stripe.customers.retrieve(sub.customer);
      const billingDate = new Date(sub.current_period_end * 1000);
      const dayOfMonth = billingDate.getDate();

      if (!billingDays[dayOfMonth]) {
        billingDays[dayOfMonth] = [];
      }

      const detail = {
        customer: customer.email || customer.name || customer.id,
        subscriptionId: sub.id,
        amount: sub.items.data[0]?.price?.unit_amount / 100,
        currency: sub.items.data[0]?.price?.currency?.toUpperCase() || 'GBP',
        interval: sub.items.data[0]?.price?.recurring?.interval,
        billingDay: dayOfMonth,
        nextBilling: billingDate.toLocaleDateString('en-GB'),
        status: sub.status
      };

      billingDays[dayOfMonth].push(detail);
      subscriptionDetails.push(detail);
    }

    // Show distribution
    console.log('📅 Billing Distribution by Day of Month:');
    console.log('');

    Object.keys(billingDays)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach(day => {
        const count = billingDays[day].length;
        const bar = '█'.repeat(Math.ceil(count / 2));
        console.log(`   Day ${day.padStart(2, ' ')}: ${bar} (${count} subscriptions)`);
      });

    console.log('');

    // Most common day
    const mostCommonDay = Object.keys(billingDays).reduce((a, b) => 
      billingDays[a].length > billingDays[b].length ? a : b
    );

    console.log(`🎯 Most Common Billing Day: ${mostCommonDay}${getOrdinalSuffix(mostCommonDay)} (${billingDays[mostCommonDay].length} subscriptions)`);
    console.log('');

    // Recommendation
    console.log('💡 RECOMMENDATION:');
    console.log('=' .repeat(80));
    console.log('');
    console.log(`   Target Day: 1st of the month (industry standard)`);
    console.log(`   Current Most Common: ${mostCommonDay}${getOrdinalSuffix(mostCommonDay)}`);
    console.log(`   Subscriptions to migrate: ${subscriptions.data.length - (billingDays['1']?.length || 0)}`);
    console.log('');

    // Detailed list
    console.log('');
    console.log('📋 DETAILED SUBSCRIPTION LIST');
    console.log('=' .repeat(80));
    console.log('');

    subscriptionDetails
      .sort((a, b) => a.billingDay - b.billingDay)
      .forEach((sub, index) => {
        console.log(`${(index + 1).toString().padStart(3, ' ')}. ${sub.customer}`);
        console.log(`     Amount: ${sub.currency} ${sub.amount.toFixed(2)}/${sub.interval}`);
        console.log(`     Billing Day: ${sub.billingDay}${getOrdinalSuffix(sub.billingDay)} of each month`);
        console.log(`     Next Billing: ${sub.nextBilling}`);
        console.log(`     Status: ${sub.status}`);
        console.log(`     Subscription ID: ${sub.subscriptionId}`);
        console.log('');
      });

    // Summary
    console.log('');
    console.log('📊 SUMMARY');
    console.log('=' .repeat(80));
    console.log('');

    const totalRevenue = subscriptionDetails.reduce((sum, sub) => sum + sub.amount, 0);
    const avgBillingDay = Math.round(
      subscriptionDetails.reduce((sum, sub) => sum + sub.billingDay, 0) / subscriptionDetails.length
    );

    console.log(`   Total Active Subscriptions: ${subscriptionDetails.length}`);
    console.log(`   Monthly Recurring Revenue: £${totalRevenue.toFixed(2)}`);
    console.log(`   Average Billing Day: ${avgBillingDay}${getOrdinalSuffix(avgBillingDay)}`);
    console.log(`   Subscriptions on 1st: ${billingDays['1']?.length || 0}`);
    console.log(`   Subscriptions NOT on 1st: ${subscriptionDetails.length - (billingDays['1']?.length || 0)}`);
    console.log('');

    // Next steps
    console.log('');
    console.log('🎯 NEXT STEPS');
    console.log('=' .repeat(80));
    console.log('');
    console.log('To align all subscriptions to the 1st of the month:');
    console.log('');
    console.log('1. Review the distribution above');
    console.log('2. Run alignment script (dry run first):');
    console.log('   node scripts/align-billing-dates.js 1 --dry-run');
    console.log('');
    console.log('3. If happy with changes, run live:');
    console.log('   node scripts/align-billing-dates.js 1 --live');
    console.log('');
    console.log('4. Notify affected customers');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('');
      console.error('💡 Make sure STRIPE_SECRET_KEY is set in your .env file');
    }
  }
}

function getOrdinalSuffix(day) {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

// Run the analysis
analyzeStripePayments();
