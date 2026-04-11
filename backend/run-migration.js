// run-migration.js — applies the agree_terms columns directly
require("dotenv").config({ path: __dirname + "/.env" });
const { pool } = require("./config/database");

const sql = `
  ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS agree_terms BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS agree_third_party BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS agree_privacy BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS org_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS completed_tours TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS email_recovery_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_payments_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_reminders_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS receipt_emails_enabled BOOLEAN DEFAULT true;

  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'direct',
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
  CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
  CREATE INDEX IF NOT EXISTS idx_messages_organization ON messages(organization_id);
`;

pool
  .query(sql)
  .then(() => {
    console.log(
      "✅ Migration applied: agree_terms, agree_third_party, org_types columns added to users",
    );
    return pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position",
    );
  })
  .then((r) => {
    console.log(
      "Current users columns:",
      r.rows.map((x) => x.column_name).join(", "),
    );
    pool.end();
  })
  .catch((err) => {
    console.error("❌ Migration error:", err.message);
    pool.end(process.exit.bind(null, 1));
  });
