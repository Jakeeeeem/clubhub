#!/usr/bin/env node

/**
 * Stripe-Based Payment Analysis
 * Analyzes payment dates directly from Stripe API
 * Can run locally - no database needed!
 * 
 * Usage:
 *   node scripts/analyze-stripe-subscriptions.js              (all subscriptions)
 *   node scripts/analyze-stripe-subscriptions.js ardwick      (Ardwick FC only)
 *   node scripts/analyze-stripe-subscriptions.js "elite fc"   (Elite FC only)
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Get account name from command line
const ACCOUNT_FILTER = process.argv[2]?.toLowerCase();

async function analyzeStripePayments() {
  console.log('💳 Stripe Payment Analysis');
  console.log('=' .repeat(80));
  if (ACCOUNT_FILTER) {
    console.log(`🔍 Filtering for: "${ACCOUNT_FILTER}"`);
  }
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

    // Get customers from the connected account
    console.log('👥 Fetching customers from connected account...');
    const customers = await stripe.customers.list({ 
      limit: 100 
    }, {
      stripeAccount: ardwickAccount.id  // Query the connected account
    });
    console.log(`   Found ${customers.data.length} customers`);
    console.log('');

    // Analyze actual payments (not subscriptions)
    console.log('💰 PAYMENT ANALYSIS');
    console.log('=' .repeat(80));
    console.log('');

    // Get payment intents from last 90 days from the connected account
    const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
    
    console.log('📊 Fetching payments from last 90 days from connected account...');
    const paymentIntents = await stripe.paymentIntents.list({ 
      limit: 100,
      created: { gte: ninetyDaysAgo }
    }, {
      stripeAccount: ardwickAccount.id  // Query the connected account
    });

    const successfulPayments = paymentIntents.data.filter(pi => pi.status === 'succeeded');
    
    console.log(`   Total Payments: ${paymentIntents.data.length}`);
    console.log(`   Successful: ${successfulPayments.length}`);
    console.log('');

    if (successfulPayments.length === 0) {
      console.log('⚠️  No successful payments found in last 90 days');
      console.log('');
      console.log('💡 Tip: Payments might be older than 90 days.');
      console.log('   Or they might be using a different payment method.');
      return;
    }

    // Group by day of month
    const paymentDays = {};
    const paymentDetails = [];

    for (const payment of successfulPayments) {
      const paymentDate = new Date(payment.created * 1000);
      const dayOfMonth = paymentDate.getDate();
      
      // Get customer info
      let customerEmail = 'Unknown';
      if (payment.customer) {
        try {
          const customer = await stripe.customers.retrieve(payment.customer, {
            stripeAccount: ardwickAccount.id  // Query from connected account
          });
          customerEmail = customer.email || customer.name || payment.customer;
        } catch (e) {
          customerEmail = payment.customer;
        }
      }

      if (!paymentDays[dayOfMonth]) {
        paymentDays[dayOfMonth] = [];
      }

      const detail = {
        customer: customerEmail,
        amount: payment.amount / 100,
        currency: payment.currency.toUpperCase(),
        date: paymentDate.toLocaleDateString('en-GB'),
        dayOfMonth: dayOfMonth,
        paymentId: payment.id,
        description: payment.description || 'Payment'
      };

      paymentDays[dayOfMonth].push(detail);
      paymentDetails.push(detail);
    }

    // Show distribution
    console.log('📅 Payment Distribution by Day of Month (Last 90 Days):');
    console.log('');

    Object.keys(paymentDays)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach(day => {
        const count = paymentDays[day].length;
        const bar = '█'.repeat(Math.ceil(count / 2));
        console.log(`   Day ${day.padStart(2, ' ')}: ${bar} (${count} payments)`);
      });

    console.log('');

    // Most common day
    const mostCommonDay = Object.keys(paymentDays).reduce((a, b) => 
      paymentDays[a].length > paymentDays[b].length ? a : b
    );

    console.log(`🎯 Most Common Payment Day: ${mostCommonDay}${getOrdinalSuffix(mostCommonDay)} (${paymentDays[mostCommonDay].length} payments)`);
    console.log('');

    // Recommendation
    console.log('💡 RECOMMENDATION:');
    console.log('=' .repeat(80));
    console.log('');
    console.log(`   Target Day: 1st of the month (industry standard)`);
    console.log(`   Current Most Common: ${mostCommonDay}${getOrdinalSuffix(mostCommonDay)}`);
    console.log(`   Payments NOT on 1st: ${successfulPayments.length - (paymentDays['1']?.length || 0)}`);
    console.log('');
    console.log('💡 Note: These are one-time payments, not subscriptions.');
    console.log('   To align recurring payments, you need to set up Stripe Subscriptions.');
    console.log('');

    // Detailed list
    console.log('');
    console.log('📋 DETAILED PAYMENT LIST (Last 90 Days)');
    console.log('=' .repeat(80));
    console.log('');

    paymentDetails
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50) // Show max 50
      .forEach((payment, index) => {
        console.log(`${(index + 1).toString().padStart(3, ' ')}. ${payment.customer}`);
        console.log(`     Amount: ${payment.currency} ${payment.amount.toFixed(2)}`);
        console.log(`     Date: ${payment.date} (Day ${payment.dayOfMonth}${getOrdinalSuffix(payment.dayOfMonth)})`);
        console.log(`     Description: ${payment.description}`);
        console.log(`     Payment ID: ${payment.paymentId}`);
        console.log('');
      });

    if (paymentDetails.length > 50) {
      console.log(`   ... and ${paymentDetails.length - 50} more payments`);
      console.log('');
    }

    // Summary
    console.log('');
    console.log('📊 SUMMARY (Last 90 Days)');
    console.log('=' .repeat(80));
    console.log('');

    const totalRevenue = paymentDetails.reduce((sum, p) => sum + p.amount, 0);
    const avgPaymentDay = Math.round(
      paymentDetails.reduce((sum, p) => sum + p.dayOfMonth, 0) / paymentDetails.length
    );
    const uniqueCustomers = new Set(paymentDetails.map(p => p.customer)).size;

    console.log(`   Total Payments: ${paymentDetails.length}`);
    console.log(`   Unique Customers: ${uniqueCustomers}`);
    console.log(`   Total Revenue: £${totalRevenue.toFixed(2)}`);
    console.log(`   Average Payment Day: ${avgPaymentDay}${getOrdinalSuffix(avgPaymentDay)}`);
    console.log(`   Payments on 1st: ${paymentDays['1']?.length || 0}`);
    console.log(`   Payments NOT on 1st: ${paymentDetails.length - (paymentDays['1']?.length || 0)}`);
    console.log('');

    // Next steps
    console.log('');
    console.log('🎯 NEXT STEPS');
    console.log('=' .repeat(80));
    console.log('');
    console.log('Current Setup: One-time payments (not recurring subscriptions)');
    console.log('');
    console.log('To align payment dates, you have two options:');
    console.log('');
    console.log('Option 1: Set up Stripe Subscriptions');
    console.log('   - Convert one-time payments to recurring subscriptions');
    console.log('   - Set billing_cycle_anchor to 1st of month');
    console.log('   - Automatic monthly billing');
    console.log('');
    console.log('Option 2: Manual coordination');
    console.log('   - Ask all players to pay on the 1st');
    console.log('   - Send payment reminders on the 1st');
    console.log('   - Less automated but simpler');
    console.log('');
    console.log('Recommended: Option 1 (Stripe Subscriptions) for automated billing');
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
