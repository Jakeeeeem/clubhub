const fs = require('fs').promises;
const path = require('path');
const { query, pool } = require('../config/database');

async function runMigrations() {
  console.log('🚀 Custom auto-migration service skipped (using db-migrate instead).');
  return;
}

module.exports = { runMigrations };
