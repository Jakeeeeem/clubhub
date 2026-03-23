#!/usr/bin/env node

/**
 * Failed vs Active Analysis for Ardwick
 *
 * Goals:
 * 1. Confirm total active plan members (verify "28 people" claim).
 * 2. Identify who OWES money (Attempted charge -> Failed -> No Retry Success).
 * 3. Summarize who paid successfully.
 */

require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = path.join(__dirname, "outstanding_debt_report.txt");
const FEB_START = new Date("2026-02-01T00:00:00Z").getTime() / 1000;

let logBuffer = "";
function log(msg) {
  console.log(msg);
  logBuffer += msg + "\n";
}

async function main() {
  log("🕵️  ARDWICK: OUTSTANDING DEBT & MEMBER COUNT");
  log("=".repeat(80));

  try {
    // 1. Find Ardwick
    const accounts = await stripe.accounts.list({ limit: 100 });
    const ardwick = accounts.data.find(
      (a) =>
        (a.business_profile?.name || "").toLowerCase().includes("ardwick") ||
        (a.settings?.dashboard?.display_name || "")
          .toLowerCase()
          .includes("ardwick"),
    );

    if (!ardwick) {
      log("❌  Ardwick account not found.");
      return;
    }
    const stripeAccount = ardwick.id;
    log(`✅  Account: ${ardwick.business_profile?.name} (${stripeAccount})`);

    // 2. Count Active Subscriptions (The "28 people")
    log("\n📊  MEMBERSHIP COUNT");
    const subscriptions = await stripe.subscriptions.list(
      {
        status: "active",
        limit: 100,
        expand: ["data.customer"],
      },
      { stripeAccount },
    );

    const activeMembers = subscriptions.data.map((s) => {
      const c = s.customer;
      const email = typeof c === "object" ? c.email || c.name : c;
      const plan = s.items.data[0].price.nickname || "Unknown Plan";
      return { email, plan, status: s.status };
    });

    log(`Total Active Subscriptions: ${activeMembers.length}`);
    // log(activeMembers.map(m => ` - ${m.email} (${m.plan})`).join("\n"));
    log("-".repeat(80));

    // 3. Analyze Charges (Feb 1 - Now)
    log("\n💰  PAYMENT STATUS (Feb 1st - Now)");

    // Fetch all charges
    const charges = [];
    let hasMore = true;
    let lastId = null;
    while (hasMore) {
      const params = {
        limit: 100,
        created: { gte: FEB_START },
        expand: ["data.customer"],
      };
      if (lastId) params.starting_after = lastId;
      const res = await stripe.charges.list(params, { stripeAccount });
      charges.push(...res.data);
      hasMore = res.has_more;
      if (res.data.length > 0) lastId = res.data[res.data.length - 1].id;
    }

    // specific tracking
    const debtorMap = {};
    const paidMap = new Set();

    // Map all customers found in charges
    charges.forEach((c) => {
      let email = "Unknown";
      if (typeof c.customer === "object") email = c.customer.email;
      else if (c.billing_details?.email) email = c.billing_details.email;

      if (!email) return;

      if (c.status === "succeeded") {
        paidMap.add(email);
        // If they paid, remove from debtor list immediately
        delete debtorMap[email];
      } else if (c.status === "failed" && !paidMap.has(email)) {
        // If failed and HAVEN'T paid yet, add/update debtor
        if (!debtorMap[email]) {
          debtorMap[email] = {
            amount: c.amount,
            count: 0,
            lastError: c.failure_message,
          };
        }
        debtorMap[email].count++;
        debtorMap[email].amount = Math.max(debtorMap[email].amount, c.amount); // Track largest failure
      }
    });

    // 4. Output Results
    const outstanding = Object.keys(debtorMap);

    if (outstanding.length === 0) {
      log(
        "✅  GOOD NEWS: Everyone who attempted to pay has successfully paid.",
      );
      log(
        "    (No pending failed charges found that were not later retried successfully)",
      );
    } else {
      log(`❌  PEOPLE WHO OWE MONEY (${outstanding.length})`);
      log(
        "These users attempted to pay but FAILED and have NOT succeeded yet:",
      );
      log("-".repeat(80));
      outstanding.forEach((email) => {
        const d = debtorMap[email];
        log(`🔴  ${email} - Owed: £${(d.amount / 100).toFixed(2)}`);
        log(`    Failed ${d.count} times. Last Error: ${d.lastError}`);
      });
    }

    log("-".repeat(80));
    log(`✅  PEOPLE WHO PAID SUCCESSFULLY: ${paidMap.size}`);

    // Check against active members
    log("\n⚠️  MISMATCH CHECK (Active vs Paid)");
    activeMembers.forEach((m) => {
      if (!paidMap.has(m.email)) {
        // Check if they are in the outstanding list?
        if (debtorMap[m.email]) {
          // Already listed above
        } else {
          // They are active but no charge attempt found?
          // Maybe they are on a trial or charge hasn't run yet?
          log(`❓  ${m.email} is Active but has NO attempted charges in Feb.`);
        }
      }
    });

    fs.writeFileSync(OUTPUT_FILE, logBuffer);
    log(`\n📄  Report saved to: ${OUTPUT_FILE}`);
  } catch (e) {
    console.error(e);
  }
}

main();
