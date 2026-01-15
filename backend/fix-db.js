const { pool } = require('./config/database');

async function fixSchema() {
  try {
    console.log('🛠️ Adding philosophy column to organizations...');
    await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS philosophy TEXT;');
    
    console.log('🛠️ Ensuring images column exists...');
    await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT \'{}\';');
    
    console.log('✅ Database schema updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating schema:', err);
    process.exit(1);
  }
}

fixSchema();
