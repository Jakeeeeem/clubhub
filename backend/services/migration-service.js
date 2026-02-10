const { query } = require("../config/database");

async function runMigrations() {
  console.log("🚀 Checking for missing database columns...");
  try {
    // Add missing columns to players table if they don't exist
    await query(`
      DO $$ 
      BEGIN 
        -- Players table updates
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='payment_plan_id') THEN
          ALTER TABLE players ADD COLUMN payment_plan_id UUID REFERENCES plans(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='plan_price') THEN
          ALTER TABLE players ADD COLUMN plan_price DECIMAL(10,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='plan_start_date') THEN
          ALTER TABLE players ADD COLUMN plan_start_date DATE;
        END IF;

        -- Invitations table updates
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='first_name') THEN
          ALTER TABLE invitations ADD COLUMN first_name VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='last_name') THEN
          ALTER TABLE invitations ADD COLUMN last_name VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='date_of_birth') THEN
          ALTER TABLE invitations ADD COLUMN date_of_birth DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='team_id') THEN
          ALTER TABLE invitations ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log("✅ Database schema is up to date.");
  } catch (err) {
    console.error("❌ Auto-migration failed:", err.message);
    // Don't crash the server, but log it
  }
}

module.exports = { runMigrations };
