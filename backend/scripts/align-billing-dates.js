#!/usr/bin/env node

/**
 * Align Billing Dates Script
 * Moves all Ardwick FC subscriptions to bill on the same day
 */

require('dotenv').config();
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Configuration
const TARGET_DAY = process.argv[2] || 1;  // Default to 1st of month
const DRY_RUN = process.argv.includes('--dry-run');

async function alignBillingDates() {
  console.log('🔄 Align Billing Dates to Same Day');
  console.log('=' .repeat(80));
  console.log('');
  console.log(`📅 Target Billing Day: ${TARGET_DAY}${getOrdinalSuffix(TARGET_DAY)} of each month`);
  console.log(`🔍 Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE (will update subscriptions)'}`);
  console.log('');

  if (DRY_RUN) {
    console.log('💡 This is a dry run. Add --live flag to actually update subscriptions.');
    console.log('');
  }

  try {
    // Find Ardwick FC
    const orgResult = await pool.query(`
      SELECT id, name, stripe_account_id 
      FROM organizations 
      WHERE LOWER(name) LIKE '%ardwick%' 
      LIMIT 1
    `);

    if (orgResult.rows.length === 0) {
      console.log('❌ Ardwick FC not found');
      return;
    }

    const ardwickFC = orgResult.rows[0];
    console.log(`✅ Found: ${ardwickFC.name}`);
    console.log('');

    // Get all players with Stripe customer IDs
    const playersResult = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.stripe_customer_id,
        pp.amount as plan_amount,
        pp.interval as plan_interval
      FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      LEFT JOIN payment_plans pp ON pp.id = (
        SELECT plan_id FROM player_payment_plans 
        WHERE player_id = u.id 
        ORDER BY created_at DESC 
        LIMIT 1
      )
      WHERE om.organization_id = $1
      AND om.role = 'player'
      AND om.status = 'active'
      AND u.stripe_customer_id IS NOT NULL
      ORDER BY u.last_name, u.first_name
    `, [ardwickFC.id]);

    const players = playersResult.rows;
    console.log(`👥 Found ${players.length} players with Stripe accounts`);
    console.log('');

    if (players.length === 0) {
      console.log('⚠️  No players with Stripe customer IDs found');
      return;
    }

    const results = {
      success: [],
      failed: [],
      skipped: [],
      alreadyAligned: []
    };

    // Process each player
    for (const player of players) {
      console.log(`\n🔧 Processing: ${player.first_name} ${player.last_name} (${player.email})`);

      try {
        // Get customer's subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: player.stripe_customer_id,
          status: 'active',
          limit: 10
        });

        if (subscriptions.data.length === 0) {
          console.log(`   ⚠️  No active subscriptions found`);
          results.skipped.push({
            player: `${player.first_name} ${player.last_name}`,
            reason: 'No active subscriptions'
          });
          continue;
        }

        // Process each subscription
        for (const subscription of subscriptions.data) {
          const currentBillingDay = new Date(subscription.current_period_end * 1000).getDate();
          
          console.log(`   📋 Subscription: ${subscription.id}`);
          console.log(`   📅 Current billing day: ${currentBillingDay}${getOrdinalSuffix(currentBillingDay)}`);

          if (currentBillingDay === parseInt(TARGET_DAY)) {
            console.log(`   ✅ Already aligned to target day`);
            results.alreadyAligned.push({
              player: `${player.first_name} ${player.last_name}`,
              subscription: subscription.id
            });
            continue;
          }

          if (DRY_RUN) {
            console.log(`   🔍 Would update billing day: ${currentBillingDay} → ${TARGET_DAY}`);
            results.success.push({
              player: `${player.first_name} ${player.last_name}`,
              subscription: subscription.id,
              oldDay: currentBillingDay,
              newDay: TARGET_DAY,
              dryRun: true
            });
          } else {
            // Update subscription billing cycle anchor
            const updated = await stripe.subscriptions.update(subscription.id, {
              billing_cycle_anchor: calculateNextBillingDate(TARGET_DAY),
              proration_behavior: 'create_prorations'  // Fair proration
            });

            console.log(`   ✅ Updated! New billing day: ${TARGET_DAY}${getOrdinalSuffix(TARGET_DAY)}`);
            results.success.push({
              player: `${player.first_name} ${player.last_name}`,
              subscription: subscription.id,
              oldDay: currentBillingDay,
              newDay: TARGET_DAY
            });
          }
        }

      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        results.failed.push({
          player: `${player.first_name} ${player.last_name}`,
          error: error.message
        });
      }
    }

    // Summary
    console.log('');
    console.log('');
    console.log('=' .repeat(80));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(80));
    console.log('');
    console.log(`✅ Successfully ${DRY_RUN ? 'analyzed' : 'updated'}: ${results.success.length}`);
    console.log(`✔️  Already aligned: ${results.alreadyAligned.length}`);
    console.log(`⚠️  Skipped: ${results.skipped.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log('');

    // Detailed results
    if (results.success.length > 0) {
      console.log(`\n✅ ${DRY_RUN ? 'WOULD UPDATE' : 'UPDATED'}:`);
      results.success.forEach(r => {
        console.log(`   • ${r.player}: Day ${r.oldDay} → Day ${r.newDay}`);
      });
    }

    if (results.alreadyAligned.length > 0) {
      console.log(`\n✔️  ALREADY ALIGNED:`);
      results.alreadyAligned.forEach(r => {
        console.log(`   • ${r.player}`);
      });
    }

    if (results.skipped.length > 0) {
      console.log(`\n⚠️  SKIPPED:`);
      results.skipped.forEach(r => {
        console.log(`   • ${r.player}: ${r.reason}`);
      });
    }

    if (results.failed.length > 0) {
      console.log(`\n❌ FAILED:`);
      results.failed.forEach(r => {
        console.log(`   • ${r.player}: ${r.error}`);
      });
    }

    console.log('');

    if (DRY_RUN) {
      console.log('💡 To actually update subscriptions, run:');
      console.log(`   node scripts/align-billing-dates.js ${TARGET_DAY} --live`);
      console.log('');
    } else {
      console.log('✨ Done! All subscriptions have been updated.');
      console.log('');
      console.log('📧 Next steps:');
      console.log('   1. Notify affected players of billing date change');
      console.log('   2. Check Stripe dashboard for proration invoices');
      console.log('   3. Monitor next billing cycle for issues');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
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

function calculateNextBillingDate(targetDay) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Try current month first
  let nextBilling = new Date(year, month, targetDay);
  
  // If that's in the past, use next month
  if (nextBilling < now) {
    nextBilling = new Date(year, month + 1, targetDay);
  }
  
  // Return as Unix timestamp
  return Math.floor(nextBilling.getTime() / 1000);
}

// Run the script
alignBillingDates();
