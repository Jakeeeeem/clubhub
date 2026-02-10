const { query } = require("./config/database");

async function run() {
  try {
    console.log("Adding columns to players table...");
    await query(`
            ALTER TABLE players 
            ADD COLUMN IF NOT EXISTS payment_plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS plan_price DECIMAL(10,2),
            ADD COLUMN IF NOT EXISTS plan_start_date DATE;
        `);
    console.log("✅ Successfully added columns to players table.");

    const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'players'
            AND column_name IN ('payment_plan_id', 'plan_price', 'plan_start_date');
        `);
    console.log("Current columns:", res.rows);

    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to update schema:", err);
    process.exit(1);
  }
}

run();
