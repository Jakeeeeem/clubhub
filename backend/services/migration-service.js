const fs = require('fs').promises;
const path = require('path');
const { query, pool } = require('../config/database');

async function runMigrations() {
  console.log('🚀 Starting auto-migration service...');

  try {
    // 1. Ensure migrations table exists
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        run_on TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // 2. Get list of already run migrations
    const { rows: runMigrations } = await query('SELECT name FROM migrations');
    const runMigrationNames = new Set(runMigrations.map(m => m.name));

    // 3. Read migration directory
    const migrationsDir = path.join(__dirname, '..', 'migrations', 'sqls');
    const files = await fs.readdir(migrationsDir);

    // 4. Sort and filter pending "up" migrations
    const pendingMigrations = files
      .filter(f => f.endsWith('-up.sql') && !runMigrationNames.has(f))
      .sort();

    if (pendingMigrations.length === 0) {
      console.log('✅ Database is already up to date.');
      return;
    }

    console.log(`📂 Found ${pendingMigrations.length} pending migrations.`);

    // 5. Run migrations in sequence
    for (const file of pendingMigrations) {
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');

      console.log(`🔧 Running migration: ${file}...`);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Split by semicolon? No, PostgreSQL can handle multi-statement strings
        // but it's safer to run it as one block. 
        // Note: db-migrate-pg just hits the pool with the whole file.
        await client.query(sql);
        
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        
        await client.query('COMMIT');
        console.log(`✅ Migration ${file} successful.`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration ${file} failed:`, err.message);
        throw err;
      } finally {
        client.release();
      }
    }

    console.log('🎉 All migrations completed successfully.');

  } catch (error) {
    console.error('❌ Auto-migration error:', error);
    // Don't swallow the error, let server startup fail if migrations fail
    throw error;
  }
}

module.exports = { runMigrations };
