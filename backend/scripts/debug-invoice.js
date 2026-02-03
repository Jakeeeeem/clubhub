require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

async function checkInvoice() {
  const accountId = "acct_1SNvPPRy3fusKxl3"; // Ardwick FC
  const subId = "sub_1SrzLmRy3fusKxl3zshyefnS"; // Sumayya Umar

  console.log(`Checking subscription ${subId} on account ${accountId}...`);

  try {
    const sub = await stripe.subscriptions.retrieve(
      subId,
      {
        expand: ["latest_invoice.lines.data"], // Incorrect expansion syntax in previous try probably caused undefined invoice
      },
      {
        stripeAccount: accountId,
      },
    );

    const invoice = sub.latest_invoice;
    if (!invoice) {
      console.log(
        "No latest invoice object found (might be string ID if expansion failed)",
      );
      return;
    }

    console.log(`Latest Invoice: ${invoice.id}`);
    console.log(`Date: ${new Date(invoice.created * 1000).toLocaleString()}`);
    console.log(`Status: ${invoice.status}`);
    console.log(`Total: ${invoice.total / 100} ${invoice.currency}`);
    console.log(
      `Amount Paid: ${invoice.amount_paid / 100} ${invoice.currency}`,
    );
    console.log(`Amount Due: ${invoice.amount_due / 100} ${invoice.currency}`);

    console.log("\nLine Items:");
    if (invoice.lines && invoice.lines.data) {
      invoice.lines.data.forEach((line) => {
        console.log(`- ${line.description}`);
        console.log(`  Amount: ${line.amount / 100}`);
        console.log(
          `  Period: ${new Date(line.period.start * 1000).toLocaleDateString()} to ${new Date(line.period.end * 1000).toLocaleDateString()}`,
        );
        console.log(`  Proration: ${line.proration}`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkInvoice();
