#!/usr/bin/env node

/**
 * Ardwick Customer Mass Migration Script
 *
 * 1. Iterates ALL customers on the connected account (not just existing subscribers).
 * 2. Checks their status (Active Sub vs No Sub).
 * 3. Actions:
 *    - If Active Sub matches target: Align billing date to NOW.
 *    - If Active Sub mismatch: Switch plan AND Align billing date to NOW.
 *    - If NO Active Sub: CREATE new subscription starting NOW.
 *
 * Usage:
 *   node scripts/migrate-ardwick-cleanup.js "ardwick" "u13-u16" --dry-run
 *   node scripts/migrate-ardwick-cleanup.js "ardwick" "u13-u16" --live
 */

require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const ACCOUNT_FILTER = (args[0] || "ardwick").toLowerCase();
const PLAN_FILTER = (args[1] || "u13-u16").toLowerCase(); // Default to the one we found
const DRY_RUN = !process.argv.includes("--live");

async function migrate() {
  console.log("🚀 Ardwick Mass Subscribe & Align Script");
  console.log("=".repeat(80));
  console.log(`🔍 Account Filter: "${ACCOUNT_FILTER}"`);
  console.log(`🔍 Plan Filter:    "${PLAN_FILTER}"`);
  console.log(
    `📅 Mode:           ${DRY_RUN ? "DRY RUN (Simulated)" : "🔴 LIVE EXECUTION"}`,
  );
  console.log("");

  try {
    // 1. Find Account
    const accounts = await stripe.accounts.list({ limit: 100 });
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
      return;
    }

    console.log(
      `✅ Target Account: ${targetAccount.business_profile?.name || "Unnamed"} (${targetAccount.email})`,
    );
    console.log(`   ID: ${targetAccount.id}`);

    // 2. Find Target Price
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
      `✅ Target Plan: ${targetPrice.nickname || targetPrice.product.name}`,
    );
    console.log(`   ID: ${targetPrice.id}`);
    console.log(`   ID: ${targetPrice.id}`);
    console.log(
      `   Amount: ${(targetPrice.unit_amount / 100).toFixed(2)} ${targetPrice.currency.toUpperCase()}`,
    );
    console.log("");

    // 3. Fetch ALL Customers (Automatic Pagination)
    console.log("👥 Fetching ALL Customers...");
    const allCustomers = [];
    for await (const customer of stripe.customers.list(
      {
        limit: 100,
        expand: ["data.subscriptions"],
      },
      { stripeAccount: targetAccount.id },
    )) {
      allCustomers.push(customer);
    }

    console.log(`   Found ${allCustomers.length} total customers.`);

    // --- DUPLICATE DETECTION ---
    console.log("🔍 Checking for Duplicates...");
    const uniqueCustomers = [];
    const seenEmails = new Set();
    const duplicates = [];

    // Sort by created date (newest first) to prefer keeping the latest account?
    // Or oldest? Standard is usually keep oldest, but if one has a sub and other doesn't, we want the sub.
    // Enhanced strategy:
    // 1. Prefer customer with Active Subscription
    // 2. Then prefer newest account

    // Sort customers: Active Sub first, then Newest Created
    allCustomers.sort((a, b) => {
      const aSub = a.subscriptions?.data.some((s) => s.status === "active");
      const bSub = b.subscriptions?.data.some((s) => s.status === "active");
      if (aSub && !bSub) return -1;
      if (!aSub && bSub) return 1;
      return b.created - a.created; // Newest first
    });

    for (const c of allCustomers) {
      if (!c.email) {
        // No email? treat as unique
        uniqueCustomers.push(c);
        continue;
      }

      const email = c.email.toLowerCase();
      if (seenEmails.has(email)) {
        duplicates.push(c);
      } else {
        seenEmails.add(email);
        uniqueCustomers.push(c);
      }
    }

    console.log(`   Unique:    ${uniqueCustomers.length}`);
    console.log(`   Duplicates: ${duplicates.length} (Skipping these)`);
    console.log("");

    const customers = uniqueCustomers; // Proceed with unique list only

    if (duplicates.length > 0) {
      console.log("⚠️  Duplicate Accounts Detected (Will be skipped):");
      duplicates.forEach((d) => console.log(`   - ${d.email} (${d.id})`));
      console.log("");
    }

    const stats = {
      total: customers.length,
      alreadyCorrect: 0,
      updated: 0,
      created: 0,
      errors: 0,
      skipped: duplicates.length,
    };

    console.log("🔄 Processing...");
    console.log("-".repeat(80));

    for (const customer of customers) {
      const name = customer.name || customer.email || "Unknown";
      const activeSub = customer.subscriptions?.data.find(
        (s) => s.status === "active" || s.status === "trialing",
      );

      // Fetch last payment for context
      let lastPaid = "Never";
      // Note: Fetching invoice for 400+ users might be slow, skipping for speed in mass run unless critical
      // We'll trust the "subscriptions" state.

      let action = "SKIP";
      let reason = "";

      if (activeSub) {
        const currentPriceId = activeSub.items.data[0].price.id;
        const matchesPlan = currentPriceId === targetPrice.id;

        if (matchesPlan) {
          // Plan matches. Do we need to align date?
          // User said "hit everyone now".
          // We will force align.
          action = "UPDATE_ALIGN";
          reason = "Has Correct Plan → Aligning Date";
        } else {
          // Wrong plan
          action = "UPDATE_SWITCH";
          reason = `Has Wrong Plan (${activeSub.items.data[0].price.nickname || "Unknown"}) → Switching & Aligning`;
        }
      } else {
        // No active subscription
        action = "CREATE";
        reason = "No Active Sub → Creating New Subscription";
      }

      console.log(`👤 ${name} (${customer.id})`);
      console.log(
        `   Status: ${activeSub ? "Active Subscriber" : "No Subscription"}`,
      );
      console.log(`   Action: ${action} (${reason})`);

      if (DRY_RUN) {
        console.log(`   [DRY RUN] Would Execute: ${action}`);
        if (action === "CREATE") stats.created++;
        if (action.startsWith("UPDATE")) stats.updated++;
      } else {
        try {
          if (action === "CREATE") {
            await stripe.subscriptions.create(
              {
                customer: customer.id,
                items: [{ price: targetPrice.id }],
                billing_cycle_anchor: "now",
                proration_behavior: "always_invoice",
              },
              { stripeAccount: targetAccount.id },
            );
            console.log("   ✅ Created");
            stats.created++;
          } else if (action === "UPDATE_ALIGN") {
            await stripe.subscriptions.update(
              activeSub.id,
              {
                billing_cycle_anchor: "now",
                proration_behavior: "always_invoice",
              },
              { stripeAccount: targetAccount.id },
            );
            console.log("   ✅ Aligned");
            stats.updated++;
          } else if (action === "UPDATE_SWITCH") {
            await stripe.subscriptions.update(
              activeSub.id,
              {
                items: [
                  {
                    id: activeSub.items.data[0].id,
                    price: targetPrice.id,
                  },
                ],
                billing_cycle_anchor: "now",
                proration_behavior: "always_invoice",
              },
              { stripeAccount: targetAccount.id },
            );
            console.log("   ✅ Switched & Aligned");
            stats.updated++;
          }
        } catch (err) {
          console.log(`   ❌ Failed: ${err.message}`);
          stats.errors++;
        }
      }
      console.log("");
    }

    console.log("📊 Final Summary");
    console.log("=".repeat(80));
    console.log(`Total Customers: ${stats.total}`);
    console.log(`New Subs (Create):  ${stats.created}`);
    console.log(`Existing (Update):  ${stats.updated}`);
    console.log(`Errors:             ${stats.errors}`);
    console.log("");

    if (DRY_RUN) {
      console.log("💡 DRY RUN COMPLETE. Use --live to execute.");
    } else {
      console.log("✨ Live execution complete.");
    }
  } catch (err) {
    console.error("Fatal Error:", err);
  }
}

migrate();
