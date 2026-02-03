#!/usr/bin/env node

/**
 * Stripe Connected Account Analysis
 *
 * inspecting connected accounts, their subscriptions, and payment history.
 * Runs directly against Stripe API (no local DB required).
 *
 * Usage:
 *   node scripts/analyze-payments.js [account_filter]
 *
 * Examples:
 *   node scripts/analyze-payments.js                 (Lists all accounts)
 *   node scripts/analyze-payments.js ardwick         (Analyzes 'Ardwick')
 *   node scripts/analyze-payments.js "demo sports"   (Analyzes 'Demo Sports')
 */

require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const ACCOUNT_FILTER = (args[0] || "").toLowerCase();

async function analyze() {
  console.log("� Stripe Connected Account Analysis");
  console.log("=".repeat(80));

  try {
    // 1. Fetch Accounts
    console.log("📡 Fetching connected accounts...");
    const accounts = await stripe.accounts.list({ limit: 100 });

    // 2. Find Target Account (if filter provided)
    let targetAccount = null;

    if (ACCOUNT_FILTER) {
      targetAccount = accounts.data.find(
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
        console.log(`❌ No account found matching "${ACCOUNT_FILTER}"`);
      }
    }

    // 3. List Accounts (if no filter or not found)
    if (!targetAccount) {
      console.log("   Available Connected Accounts:");
      console.log("   " + "-".repeat(90));
      console.log(
        "   ID                  | Name                           | Email                | Customers",
      );
      console.log("   " + "-".repeat(90));

      for (const a of accounts.data) {
        const name =
          a.business_profile?.name ||
          a.settings?.dashboard?.display_name ||
          "No Name";
        const email = a.email || "No Email";
        const id = a.id.padEnd(19);
        const namePadded = name.padEnd(30);
        const emailPadded = email.padEnd(20);

        // Quick check for customers
        let customerCount = "-";
        try {
          // Correct API usage: list(params, options)
          const c = await stripe.customers.list(
            { limit: 100 },
            { stripeAccount: a.id },
          );
          customerCount = c.data.length + (c.has_more ? "+" : "");
        } catch (e) {
          customerCount = "Err";
        }

        console.log(
          `   ${id} | ${namePadded} | ${emailPadded} | ${customerCount}`,
        );
      }
      console.log("");
      if (ACCOUNT_FILTER) return; // Exit if we were looking for specific one and failed

      console.log("💡 Tip: Run with a name to analyze specific account:");
      console.log("   node scripts/analyze-payments.js <name>");
      return;
    }

    // 4. Analyze Target Account
    console.log(
      `✅ Analyzing: ${targetAccount.business_profile?.name || "Unnamed"} (${targetAccount.id})`,
    );
    console.log("=".repeat(80));
    console.log("");

    // --- Subscriptions ---
    console.log("📦 Active Subscriptions");
    const subscriptions = await stripe.subscriptions.list(
      {
        status: "active",
        limit: 100,
        expand: ["data.customer", "data.latest_invoice"],
      },
      { stripeAccount: targetAccount.id },
    );

    if (subscriptions.data.length === 0) {
      console.log("   ⚠️  No active subscriptions found.");
    } else {
      console.log(
        `   Found ${subscriptions.data.length} active subscriptions.`,
      );
      console.log("");

      for (const sub of subscriptions.data) {
        const customerName =
          sub.customer.name || sub.customer.email || "Unknown Customer";
        const price = sub.items.data[0].price;
        const planName = price.nickname || price.product.name || "Unknown Plan";
        const amount =
          (price.unit_amount / 100).toFixed(2) +
          " " +
          price.currency.toUpperCase();

        let lastPaid = "N/A";
        if (sub.latest_invoice && typeof sub.latest_invoice === "object") {
          lastPaid = new Date(sub.latest_invoice.created * 1000).toDateString();
        }

        const nextBill = new Date(sub.current_period_end * 1000).toDateString();

        console.log(`   👤 ${customerName}`);
        console.log(
          `      Plan: ${planName} (${amount} / ${price.recurring?.interval})`,
        );
        console.log(`      Last Payment: ${lastPaid}`);
        console.log(`      Next Billing: ${nextBill}`);
        console.log(`      ID: ${sub.id}`);
        console.log("      " + "-".repeat(40));
      }
    }
    console.log("");

    // --- Recents Payments (Intents) ---
    console.log("💰 Recent Payments (Last 30 Days)");
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const payments = await stripe.paymentIntents.list(
      {
        limit: 20,
        created: { gte: thirtyDaysAgo },
      },
      { stripeAccount: targetAccount.id },
    );

    const successful = payments.data.filter((p) => p.status === "succeeded");

    if (successful.length === 0) {
      console.log("   ⚠️  No successful payments in last 30 days.");
    } else {
      console.log(`   Found ${successful.length} successful payments.`);
      successful.forEach((p) => {
        const date = new Date(p.created * 1000).toDateString();
        const amt =
          (p.amount / 100).toFixed(2) + " " + p.currency.toUpperCase();
        console.log(
          `   - ${date}: ${amt} (${p.description || "No description"})`,
        );
      });
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

analyze();
