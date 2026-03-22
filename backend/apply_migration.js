require('dotenv').config();
const { query } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function apply() {
  const sqlFile = path.join(__dirname, 'migrations', 'sqls', '20260322150847-create-scheduled-notifications-up.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  try {
    console.log('🚀 Applying migration manually...');
    await query(sql);
    console.log('✅ Migration applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

apply();
