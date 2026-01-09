#!/usr/bin/env node

/**
 * Stripe Payout Configuration Script
 * Updates all connected accounts to monthly payouts on the 1st
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Configuration
const PAYOUT_CONFIG = {
  interval: 'monthly',        // Options: 'daily', 'weekly', 'monthly', 'manual'
  monthly_anchor: 1,          // Day of month (1-31) - 1st of the month
  delay_days: 'minimum'       // Options: 'minimum' or a number (2-7 days)
};

async function updateAllPayoutSchedules() {
  console.log('🚀 Starting Stripe Payout Configuration...\n');
  console.log(`📅 Target Schedule: ${PAYOUT_CONFIG.interval} on day ${PAYOUT_CONFIG.monthly_anchor}`);
  console.log(`⏱️  Delay: ${PAYOUT_CONFIG.delay_days}\n`);

  try {
    // Fetch all connected accounts
    console.log('📋 Fetching all connected accounts...');
    const accounts = await stripe.accounts.list({ limit: 100 });
    
    console.log(`✅ Found ${accounts.data.length} connected accounts\n`);

    if (accounts.data.length === 0) {
      console.log('⚠️  No connected accounts found. Nothing to update.');
      return;
    }

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    // Update each account
    for (const account of accounts.data) {
      const accountId = account.id;
      const businessName = account.business_profile?.name || account.email || accountId;

      try {
        console.log(`\n🔧 Updating: ${businessName} (${accountId})`);

        // Check if payouts are enabled
        if (!account.payouts_enabled) {
          console.log(`   ⚠️  Payouts not enabled - skipping`);
          results.skipped.push({
            id: accountId,
            name: businessName,
            reason: 'Payouts not enabled'
          });
          continue;
        }

        // Update the payout schedule
        const updatedAccount = await stripe.accounts.update(accountId, {
          settings: {
            payouts: {
              schedule: PAYOUT_CONFIG
            }
          }
        });

        console.log(`   ✅ Success! New schedule: ${updatedAccount.settings.payouts.schedule.interval}`);
        results.success.push({
          id: accountId,
          name: businessName,
          schedule: updatedAccount.settings.payouts.schedule
        });

      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        results.failed.push({
          id: accountId,
          name: businessName,
          error: error.message
        });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⚠️  Skipped: ${results.skipped.length}`);
    console.log('='.repeat(60));

    // Show details of successful updates
    if (results.success.length > 0) {
      console.log('\n✅ SUCCESSFUL UPDATES:');
      results.success.forEach(item => {
        console.log(`   • ${item.name}`);
        console.log(`     Schedule: ${item.schedule.interval} on day ${item.schedule.monthly_anchor}`);
      });
    }

    // Show failed updates
    if (results.failed.length > 0) {
      console.log('\n❌ FAILED UPDATES:');
      results.failed.forEach(item => {
        console.log(`   • ${item.name}: ${item.error}`);
      });
    }

    // Show skipped accounts
    if (results.skipped.length > 0) {
      console.log('\n⚠️  SKIPPED ACCOUNTS:');
      results.skipped.forEach(item => {
        console.log(`   • ${item.name}: ${item.reason}`);
      });
    }

    console.log('\n✨ Done!\n');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    process.exit(1);
  }
}

// Run the script
updateAllPayoutSchedules();
