#!/usr/bin/env node

/**
 * Ardwick FC Payment Analysis Script
 * Shows when all users pay their subscriptions
 * Goal: Align everyone to pay on the same day
 */

require('dotenv').config();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function analyzeArdwickFCPayments() {
  console.log('🏟️  Ardwick FC Payment Analysis');
  console.log('=' .repeat(80));
  console.log('');

  try {
    // Find Ardwick FC organization
    const orgResult = await pool.query(`
      SELECT id, name FROM organizations 
      WHERE LOWER(name) LIKE '%ardwick%' 
      LIMIT 1
    `);

    if (orgResult.rows.length === 0) {
      console.log('❌ Ardwick FC not found in database');
      console.log('');
      console.log('Available organizations:');
      const allOrgs = await pool.query('SELECT name FROM organizations ORDER BY name');
      allOrgs.rows.forEach(org => console.log(`  - ${org.name}`));
      return;
    }

    const ardwickFC = orgResult.rows[0];
    console.log(`✅ Found: ${ardwickFC.name} (ID: ${ardwickFC.id})`);
    console.log('');

    // Get all members with payment information
    const membersResult = await pool.query(`
      SELECT 
        om.id as membership_id,
        u.first_name,
        u.last_name,
        u.email,
        om.role,
        om.status,
        om.joined_at,
        
        -- Payment plan info
        pp.id as plan_id,
        pp.name as plan_name,
        pp.amount as plan_amount,
        pp.interval as plan_interval,
        
        -- Latest payment
        p.id as latest_payment_id,
        p.amount as latest_payment_amount,
        p.paid_date as latest_payment_date,
        p.payment_status,
        
        -- Stripe subscription info (if exists)
        u.stripe_customer_id,
        om.permissions
        
      FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      LEFT JOIN payment_plans pp ON pp.id = (
        SELECT plan_id FROM player_payment_plans 
        WHERE player_id = u.id 
        ORDER BY created_at DESC 
        LIMIT 1
      )
      LEFT JOIN payments p ON p.player_id = u.id AND p.id = (
        SELECT id FROM payments 
        WHERE player_id = u.id 
        ORDER BY paid_date DESC 
        LIMIT 1
      )
      WHERE om.organization_id = $1
      AND om.status = 'active'
      ORDER BY 
        CASE om.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'coach' THEN 3
          WHEN 'player' THEN 4
          ELSE 5
        END,
        u.last_name,
        u.first_name
    `, [ardwickFC.id]);

    const members = membersResult.rows;
    console.log(`📊 Total Active Members: ${members.length}`);
    console.log('');

    // Categorize by role
    const byRole = {};
    members.forEach(m => {
      if (!byRole[m.role]) byRole[m.role] = [];
      byRole[m.role].push(m);
    });

    console.log('👥 Members by Role:');
    Object.keys(byRole).forEach(role => {
      console.log(`   ${role}: ${byRole[role].length}`);
    });
    console.log('');

    // Payment analysis
    console.log('💰 PAYMENT ANALYSIS');
    console.log('=' .repeat(80));
    console.log('');

    const playersWithPayments = members.filter(m => 
      m.role === 'player' && m.latest_payment_date
    );

    if (playersWithPayments.length === 0) {
      console.log('⚠️  No payment records found for players');
      console.log('');
      console.log('💡 Tip: Payments may be tracked in Stripe directly.');
      console.log('   Run the Stripe analysis script for subscription data.');
    } else {
      // Group by payment day of month
      const paymentDays = {};
      playersWithPayments.forEach(m => {
        const paymentDate = new Date(m.latest_payment_date);
        const dayOfMonth = paymentDate.getDate();
        
        if (!paymentDays[dayOfMonth]) {
          paymentDays[dayOfMonth] = [];
        }
        paymentDays[dayOfMonth].push(m);
      });

      console.log('📅 Payment Distribution by Day of Month:');
      console.log('');
      
      Object.keys(paymentDays)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(day => {
          const count = paymentDays[day].length;
          const bar = '█'.repeat(Math.ceil(count / 2));
          console.log(`   Day ${day.padStart(2, ' ')}: ${bar} (${count} players)`);
        });

      console.log('');

      // Most common payment day
      const mostCommonDay = Object.keys(paymentDays).reduce((a, b) => 
        paymentDays[a].length > paymentDays[b].length ? a : b
      );

      console.log(`🎯 Most Common Payment Day: ${mostCommonDay}th of the month (${paymentDays[mostCommonDay].length} players)`);
      console.log('');

      // Recommendation
      console.log('💡 RECOMMENDATION:');
      console.log('=' .repeat(80));
      console.log('');
      console.log(`   Target Day: 1st of the month (industry standard)`);
      console.log(`   Current Most Common: ${mostCommonDay}th`);
      console.log(`   Players to migrate: ${members.filter(m => m.role === 'player').length - (paymentDays['1'] || []).length}`);
      console.log('');
    }

    // Detailed member list
    console.log('');
    console.log('📋 DETAILED MEMBER LIST');
    console.log('=' .repeat(80));
    console.log('');

    const formatCurrency = (amount) => amount ? `£${parseFloat(amount).toFixed(2)}` : 'N/A';
    const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB') : 'Never';
    const formatRole = (role) => role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');

    members.forEach((m, index) => {
      console.log(`${(index + 1).toString().padStart(3, ' ')}. ${m.first_name} ${m.last_name}`);
      console.log(`     Email: ${m.email}`);
      console.log(`     Role: ${formatRole(m.role)}`);
      console.log(`     Joined: ${formatDate(m.joined_at)}`);
      
      if (m.plan_name) {
        console.log(`     Plan: ${m.plan_name} - ${formatCurrency(m.plan_amount)}/${m.plan_interval}`);
      } else {
        console.log(`     Plan: No payment plan assigned`);
      }
      
      if (m.latest_payment_date) {
        const paymentDate = new Date(m.latest_payment_date);
        const dayOfMonth = paymentDate.getDate();
        console.log(`     Last Payment: ${formatCurrency(m.latest_payment_amount)} on ${formatDate(m.latest_payment_date)} (Day ${dayOfMonth})`);
        console.log(`     Status: ${m.payment_status || 'Unknown'}`);
      } else {
        console.log(`     Last Payment: None recorded`);
      }
      
      console.log('');
    });

    // Summary statistics
    console.log('');
    console.log('📊 SUMMARY STATISTICS');
    console.log('=' .repeat(80));
    console.log('');

    const totalPlayers = members.filter(m => m.role === 'player').length;
    const playersWithPlans = members.filter(m => m.role === 'player' && m.plan_id).length;
    const playersWithPaymentHistory = members.filter(m => m.role === 'player' && m.latest_payment_date).length;

    console.log(`   Total Players: ${totalPlayers}`);
    console.log(`   Players with Payment Plans: ${playersWithPlans} (${Math.round(playersWithPlans/totalPlayers*100)}%)`);
    console.log(`   Players with Payment History: ${playersWithPaymentHistory} (${Math.round(playersWithPaymentHistory/totalPlayers*100)}%)`);
    console.log(`   Players without Plans: ${totalPlayers - playersWithPlans}`);
    console.log('');

    // Total revenue
    const totalRevenue = members
      .filter(m => m.plan_amount)
      .reduce((sum, m) => sum + parseFloat(m.plan_amount), 0);

    console.log(`   💰 Monthly Recurring Revenue: ${formatCurrency(totalRevenue)}`);
    console.log('');

    // Next steps
    console.log('');
    console.log('🎯 NEXT STEPS TO ALIGN PAYMENT DATES');
    console.log('=' .repeat(80));
    console.log('');
    console.log('1. Choose target billing day (recommended: 1st of month)');
    console.log('2. Update Stripe subscriptions to bill on target day');
    console.log('3. Notify players of billing date change');
    console.log('4. Use proration to handle mid-cycle changes');
    console.log('');
    console.log('📝 Run this command to update Stripe subscriptions:');
    console.log('   node scripts/align-billing-dates.js --target-day 1');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Run the analysis
analyzeArdwickFCPayments();
