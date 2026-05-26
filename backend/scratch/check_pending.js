const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { pool } = require('../config/database');

async function searchPending() {
  try {
    // 1. Get all user tables
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log("Database Tables:", tables);

    // 2. Query each table's columns and look for 'pending' in any column
    for (const table of tables) {
      const colsRes = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
      `, [table]);

      const textCols = colsRes.rows
        .filter(c => ['character varying', 'text', 'character'].includes(c.data_type))
        .map(c => c.column_name);

      if (textCols.length === 0) continue;

      // Build a query to find any row where any text column contains 'pending'
      const conditions = textCols.map(col => `LOWER("${col}") LIKE '%pending%'`).join(' OR ');
      try {
        const matchRes = await pool.query(`
          SELECT * FROM "${table}" WHERE ${conditions} LIMIT 10
        `);
        if (matchRes.rows.length > 0) {
          console.log(`\nFound matches in table "${table}":`);
          console.table(matchRes.rows);
        }
      } catch (err) {
        // Some columns might not be directly queryable or throw other errors, ignore
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Error executing query:", error);
    process.exit(1);
  }
}

searchPending();
