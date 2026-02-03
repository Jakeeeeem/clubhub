#!/usr/bin/env node

/**
 * Migration Script: Move Connected Account Customers to Monthly Plan & Align Date
 *
 * Target: Ardwick (or specified account)
 * Action:
 *  1. Switch active customers to the "Monthly" plan (if not already).
 *  2. Reset billing cycle to 'now' (charges immediately) to align payment date to today.
 *
 * Usage:
 *   node scripts/migrate-ardwick-stripe-direct.js [account_filter] [plan_filter] --dry-run
 *   node scripts/migrate-ardwick-stripe-direct.js [account_filter] [plan_filter] --live
 *
 * Examples:
 *   node scripts/migrate-ardwick-stripe-direct.js                      (Defaults: "ardwick", "monthly")
 *   node scripts/migrate-ardwick-stripe-direct.js "elite" "gold"       (Filter for "elite" account, "gold" plan)
 */

require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const ACCOUNT_FILTER = (args[0] || "ardwick").toLowerCase();
const PLAN_FILTER = (args[1] || "monthly").toLowerCase();
const DRY_RUN = !process.argv.includes("--live");

async function migrate() {
  console.log("🔄 Stripe Connected Account Migration");
  console.log("=".repeat(80));
  console.log(`🔍 Account Filter: "${ACCOUNT_FILTER}"`);
  console.log(`🔍 Plan Filter:    "${PLAN_FILTER}"`);
  console.log(
    `📅 Mode:           ${DRY_RUN ? "DRY RUN (Simulated)" : "🔴 LIVE EXECUTION"}`,
  );
  console.log("");

  try {
    // 1. Find Connected Account
    console.log("📡 Fetching connected accounts...");
    const accounts = await stripe.accounts.list({ limit: 100 });

    // Debug: List all found if dry run
    if (DRY_RUN) {
      // console.log("   Debug - Found Accounts: " + accounts.data.map(a => `${a.business_profile?.name || 'Unset'} (${a.email})`).join(', '));
    }

    const targetAccount = accounts.data.find(
      (acc) =>
        (acc.business_profile?.name || "")
          .toLowerCase()
          .includes(ACCOUNT_FILTER) ||
        (acc.settings?.dashboard?.display_name || "")
          .toLowerCase()
          .includes(ACCOUNT_FILTER) ||
        (acc.email || "").toLowerCase().includes(ACCOUNT_FILTER) ||
        acc.id === ACCOUNT_FILTER,
    );

    if (!targetAccount) {
      console.log(`❌ Account matching "${ACCOUNT_FILTER}" not found.`);
      console.log("   Available Accounts (ID | Name | Email | Metadata):");
      accounts.data.forEach((a) => {
        const name =
          a.business_profile?.name ||
          a.settings?.dashboard?.display_name ||
          "No Name";
        const email = a.email || "No Email";
        const meta = JSON.stringify(a.metadata || {});
        console.log(`   - ${a.id} | ${name} | ${email} | ${meta}`);
      });
      return;
    }

    console.log(
      `✅ Target Account: ${targetAccount.business_profile?.name || "Unnamed"} (${targetAccount.email})`,
    );
    console.log(`   ID: ${targetAccount.id}`);
    console.log("");

    // 2. Find the Target Price/Plan on the connected account
    console.log(`🔍 Searching for plan matching "${PLAN_FILTER}"...`);
    const prices = await stripe.prices.list(
      {
        active: true,
        limit: 100,
        expand: ["data.product"],
      },
      { stripeAccount: targetAccount.id },
    );

    const targetPrice = prices.data.find((p) => {
      const nickname = (p.nickname || "").toLowerCase();
      const productName = (p.product.name || "").toLowerCase();
      return (
        nickname.includes(PLAN_FILTER) || productName.includes(PLAN_FILTER)
      );
    });

    if (!targetPrice) {
      console.log(`❌ No plan found matching "${PLAN_FILTER}".`);
      console.log(
        "   Available Plans:",
        prices.data
          .map((p) => `${p.nickname || p.product.name} (${p.id})`)
          .join(", "),
      );
      return;
    }

    console.log(
      `✅ Found Target Plan: ${targetPrice.nickname || targetPrice.product.name}`,
    );
    console.log(`   Price ID: ${targetPrice.id}`);
    console.log(
      `   Amount: ${(targetPrice.unit_amount / 100).toFixed(2)} ${targetPrice.currency.toUpperCase()}`,
    );
    console.log("");

    // 3. List Customers and their Subscriptions
    console.log("👥 Fetching Active Subscriptions...");
    const subscriptions = await stripe.subscriptions.list(
      {
        status: "active",
        limit: 100,
        expand: ["data.customer"],
      },
      { stripeAccount: targetAccount.id },
    );

    if (subscriptions.data.length === 0) {
      console.log("⚠️  No active subscriptions found on this account.");
      return;
    }

    console.log(`   Found ${subscriptions.data.length} active subscriptions.`);
    console.log("");

    const stats = {
      total: subscriptions.data.length,
      processed: 0,
      errors: 0,
    };

    for (const sub of subscriptions.data) {
      const customerName =
        sub.customer.name || sub.customer.email || sub.customer.id;
      const currentItem = sub.items.data[0];
      const currentPrice = currentItem.price;
      const isTargetPlan = currentPrice.id === targetPrice.id;

      console.log(`👤 ${customerName} (${sub.id})`);
      console.log(
        `   Current Plan: ${currentPrice.nickname || currentPrice.product.name || "Unknown"}`,
      );

      // Fetch latest invoice to see last payment
      let lastPaid = "Unknown";
      try {
        if (sub.latest_invoice) {
          const invoice = await stripe.invoices.retrieve(
            typeof sub.latest_invoice === "string"
              ? sub.latest_invoice
              : sub.latest_invoice.id,
            { stripeAccount: targetAccount.id },
          );
          lastPaid = new Date(invoice.created * 1000).toDateString();
        }
      } catch (e) {}

      console.log(`   Last Payment: ${lastPaid}`);
      console.log(
        `   Period End:   ${new Date(sub.current_period_end * 1000).toDateString()}`,
      );

      // Actions needed
      let actions = [];
      let needsUpdate = false;

      // 1. Switch Plan checks
      if (!isTargetPlan) {
        actions.push(`Switch Plan → ${targetPrice.nickname || "Target Plan"}`);
        needsUpdate = true;
      } else {
        actions.push(`Plan OK`);
      }

      // 2. Align Date checks
      // We ALWAYS want to align date to today per user request ("take payment to day")
      actions.push(`Align Date (Charge Now)`);
      needsUpdate = true; // Even if plan matches, we force date update

      if (DRY_RUN) {
        console.log(`   [DRY RUN] Would: ${actions.join(", ")}`);
        stats.processed++;
      } else {
        console.log(`   🚀 Executing: ${actions.join(", ")}...`);

        const updateParams = {
          proration_behavior: "always_invoice",
          billing_cycle_anchor: "now", // This resets the billing cycle to NOW
        };

        if (!isTargetPlan) {
          updateParams.items = [
            {
              id: currentItem.id,
              price: targetPrice.id,
            },
          ];
        }

        try {
          await stripe.subscriptions.update(sub.id, updateParams, {
            stripeAccount: targetAccount.id,
          });
          console.log(`   ✅ Success`);
          stats.processed++;
        } catch (err) {
          console.log(`   ❌ Failed: ${err.message}`);
          stats.errors++;
        }
      }
      console.log(""); // Spacer
    }

    console.log("📊 Migration Summary");
    console.log("=".repeat(80));
    console.log(`Total Found: ${stats.total}`);
    console.log(`Processed:   ${stats.processed}`);
    console.log(`Errors:      ${stats.errors}`);
    console.log("");

    if (DRY_RUN) {
      console.log("💡 This was a DRY RUN. No changes were made.");
      console.log("   To execute, add the --live flag.");
    } else {
      console.log("✨ Live execution complete.");
    }
  } catch (err) {
    console.error("❌ Fatal Error:", err.message);
  }
}

migrate();
