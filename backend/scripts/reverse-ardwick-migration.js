require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const ACCOUNT_ID = "acct_1SNvPPRy3fusKxl3"; // Ardwick FC
const TARGET_PLAN_NAME = "u13-u16"; // Filter to be safe

// Target Date: March 1st, 2026 at 00:00:00 UTC (or roughly start of day)
// Users are typically UK based, so UTC is fine provided it's 1st.
const MARCH_1SF_2026_TS = 1772323200; // Sun Mar 01 2026 00:00:00 GMT+0000

async function reverse() {
  console.log("🚨 STARTING REVERSAL & REFUND SCRIPT 🚨");
  console.log(`Target Account: ${ACCOUNT_ID}`);
  console.log("-----------------------------------------");

  const subscriptions = await stripe.subscriptions.list(
    {
      status: "active",
      limit: 100,
      expand: ["data.latest_invoice"],
    },
    { stripeAccount: ACCOUNT_ID },
  );

  console.log(`Found ${subscriptions.data.length} active subscriptions.`);

  let refundCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  for (const sub of subscriptions.data) {
    try {
      console.log(`\nProcessing ${sub.id}...`);

      // 1. REFUND THE PRORATED CHARGE (If from today)
      const invoice = sub.latest_invoice;
      const invoiceDate = new Date(invoice.created * 1000);
      const today = new Date();

      // Check if invoice was created in the last 2 hours (approx migration time)
      const isRecent = today - invoiceDate < 1000 * 60 * 60 * 4; // 4 hours safety window

      if (
        isRecent &&
        invoice.amount_paid > 0 &&
        invoice.status === "paid" &&
        invoice.charge
      ) {
        console.log(
          `   💸  Refunding Invoice ${invoice.id} (${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency})...`,
        );

        try {
          await stripe.refunds.create(
            {
              charge: invoice.charge,
              reason: "requested_by_customer",
            },
            { stripeAccount: ACCOUNT_ID },
          );
          console.log(`   ✅ Refund issued.`);
          refundCount++;
        } catch (refErr) {
          if (refErr.message.includes("already been refunded")) {
            console.log(`   ⚠️  Already refunded.`);
          } else {
            console.error(`   ❌ Refund Failed: ${refErr.message}`);
            errorCount++;
          }
        }
      } else {
        console.log(
          `   ℹ️  No recent chargeable invoice found to refund (Invoice date: ${invoiceDate.toLocaleTimeString()}).`,
        );
      }

      // 2. REVERT BILLING DATE TO 1st VIA TRIAL
      // We set trial_end to March 1st. This effectively gives them "free" access until then (which is correct as they paid Feb 1st already),
      // and ensures the next automatic charge happens exactly on March 1st.
      console.log(`   📅  Rescheduling next charge to March 1st...`);

      await stripe.subscriptions.update(
        sub.id,
        {
          trial_end: MARCH_1SF_2026_TS,
          proration_behavior: "none", // Do not create any new line items
        },
        { stripeAccount: ACCOUNT_ID },
      );

      console.log(`   ✅ Date corrected to Mar 1st.`);
      updateCount++;
    } catch (err) {
      console.error(`   ❌ Error processing ${sub.id}: ${err.message}`);
      errorCount++;
    }
  }

  console.log("\n-----------------------------------------");
  console.log(`SUMMARY:`);
  console.log(`Refunds Issued: ${refundCount}`);
  console.log(`Dates Reverted: ${updateCount}`);
  console.log(`Errors:         ${errorCount}`);
  console.log("-----------------------------------------");
}

reverse();
