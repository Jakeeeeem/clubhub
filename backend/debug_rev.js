require("dotenv").config();
const { query } = require("./config/database");

async function checkData() {
  try {
    console.log("Checking Players for monthly_fee...");
    const res = await query(
      "SELECT id, first_name, last_name, monthly_fee FROM players WHERE monthly_fee > 0",
    );
    console.log("Players with fee:", res.rows);

    console.log("Checking Clubs for stripe_account_id...");
    const clubs = await query(
      "SELECT id, name, stripe_account_id FROM organizations",
    );
    console.log("Clubs:", clubs.rows);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkData();
