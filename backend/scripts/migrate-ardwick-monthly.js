#!/usr/bin/env node

/**
 * Migrate Ardwick Connected Customers to Monthly Plan
 *
 * Usage:
 *   node scripts/migrate-ardwick-monthly.js --dry-run
 *   node scripts/migrate-ardwick-monthly.js --live
 */

require("dotenv").config();
const { Pool } = require("pg");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST === "db" ? "localhost" : process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_HOST === "db" ? 5435 : process.env.DB_PORT,
  ssl:
    process.env.DATABASE_URL && process.env.DATABASE_URL.includes("ssl")
      ? { rejectUnauthorized: false }
      : false,
});

const DRY_RUN = !process.argv.includes("--live");

async function migrateToMonthly() {
  console.log("🔄 Migrate Ardwick Active Customers to Monthly Plan");
  console.log("=".repeat(80));
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(
    `🔍 Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (updating Stripe & DB)"}`,
  );
  console.log("");

  try {
    // 1. Find Ardwick FC Organization
    const orgResult = await pool.query(`
      SELECT id, name, stripe_account_id 
      FROM organizations 
      WHERE LOWER(name) LIKE '%ardwick%' 
      LIMIT 1
    `);

    if (orgResult.rows.length === 0) {
      console.log("❌ Ardwick FC not found");
      return;
    }

    const org = orgResult.rows[0];
    console.log(`✅ Organization: ${org.name}`);
    if (!org.stripe_account_id) {
      console.log("❌ No connected Stripe account ID found for this org.");
      return;
    }
    console.log(`   Stripe Account: ${org.stripe_account_id}`);

    // 2. Find Monthly Plan
    const plansResult = await pool.query(
      `
        SELECT * FROM payment_plans 
        WHERE organization_id = $1 
        AND LOWER(name) LIKE '%monthly%'
    `,
      [org.id],
    );

    if (plansResult.rows.length === 0) {
      console.log('❌ No "Monthly" payment plan found for this organization.');
      // List available plans
      const allPlans = await pool.query(
        `SELECT * FROM payment_plans WHERE organization_id = $1`,
        [org.id],
      );
      console.log(
        "   Available plans:",
        allPlans.rows.map((p) => p.name).join(", "),
      );
      return;
    }

    const targetPlan = plansResult.rows[0]; // Take the first matching one
    console.log(`✅ Target Plan: ${targetPlan.name}`);
    console.log(
      `   Amount: ${targetPlan.amount} ${targetPlan.currency.toUpperCase()}`,
    );
    console.log(`   Interval: ${targetPlan.interval}`);
    console.log(`   Stripe Price ID: ${targetPlan.stripe_price_id}`);

    if (!targetPlan.stripe_price_id) {
      console.log("❌ Target plan has no Stripe Price ID.");
      return;
    }

    // 3. Find Active Players
    const playersResult = await pool.query(
      `
      SELECT 
        u.id, 
        u.first_name, 
        u.last_name, 
        u.email, 
        u.stripe_customer_id
      FROM organization_members om
      JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = $1 
      AND om.role = 'player' 
      AND om.status = 'active'
      AND u.stripe_customer_id IS NOT NULL
      ORDER BY u.last_name
    `,
      [org.id],
    );

    const players = playersResult.rows;
    console.log(`👥 Active Players with Stripe ID: ${players.length}`);
    console.log("");

    const stats = {
      processed: 0,
      needsMigration: 0,
      needsDateUpdate: 0,
      alreadyCorrect: 0,
      errors: 0,
    };

    for (const player of players) {
      console.log(
        `👤 Checking ${player.first_name} ${player.last_name} (${player.email})`,
      );

      try {
        // Fetch subscriptions from Stripe (Connected Account or Platform?)
        // Assuming customers are on the Platform but subscription is for the Org.
        // Or maybe created ON the connected account?
        // "script we created for the stripe conenected accounts" implies the customers might exist on the connected account
        // OR the subscription creates a transfer.
        // Typically in this app (ClubHub), subscriptions seem to be on the Platform but transfer to the Connect account?
        // Let's assume standard behavior: Subscriptions are on the Platform account, with `transfer_data` to Connected Account.

        const subscriptions = await stripe.subscriptions.list({
          customer: player.stripe_customer_id,
          status: "active",
          limit: 5,
          expand: ["data.items.data.price"],
        });

        if (subscriptions.data.length === 0) {
          console.log(`   ⚠️ No active subscriptions found.`);
          continue;
        }

        for (const sub of subscriptions.data) {
          const currentPriceId = sub.items.data[0].price.id;
          const isCorrectPlan = currentPriceId === targetPlan.stripe_price_id;

          // Check billing date
          const currentBillingDay = new Date(
            sub.current_period_end * 1000,
          ).getDate();
          const today = new Date().getDate();
          // User said "move there dates to take payment to day".
          // We'll interpret this as aligning the anchor to "now" (so it charges immediately) or today's day of month.
          // If we set `billing_cycle_anchor: 'now'`, it charges immediately and resets cycle.

          const needsPlanChange = !isCorrectPlan;

          // If purely date change to TODAY:
          // We always want to align to today if requested.
          // But if they are already on the plan and paid recently, maybe we don't want to double charge?
          // "move there dates to take payment to day" implies forcing a payment today.

          console.log(
            `   📋 Sub: ${sub.id} | Plan: ${sub.items.data[0].price.nickname || "Unknown"} | End: ${new Date(sub.current_period_end * 1000).toDateString()}`,
          );

          let actions = [];
          if (needsPlanChange) actions.push(`Switch to ${targetPlan.name}`);
          actions.push(`Align date to today (Charge Now)`);

          if (DRY_RUN) {
            console.log(`   🔍 [DRY RUN] Would: ${actions.join(", ")}`);
            stats.needsMigration++;
          } else {
            // LIVE UPDATE
            console.log(`   🚀 Updating...`);

            const updateParams = {
              proration_behavior: "always_invoice", // Charge immediately for the new plan/cycle
              billing_cycle_anchor: "now", // Reset cycle to today, charging immediately
            };

            if (needsPlanChange) {
              // We need to swap the item
              const itemId = sub.items.data[0].id;
              updateParams.items = [
                {
                  id: itemId,
                  price: targetPlan.stripe_price_id,
                },
              ];
            }

            await stripe.subscriptions.update(sub.id, updateParams);
            console.log(`   ✅ Success!`);
            stats.processed++;
          }
        }
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
        stats.errors++;
      }
    }

    console.log("\n📊 Summary");
    console.log(stats);
  } catch (err) {
    console.error("Fatal Error:", err);
  } finally {
    await pool.end();
  }
}

migrateToMonthly();
