const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function check() {
  const envContent = fs.readFileSync(path.join(__dirname, 'backend', 'clubhub-dev.env'), 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) env[parts[0].trim()] = parts[1].trim();
  });

  const pool = new Pool({
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT) || 5432,
    database: env.DB_NAME || 'clubhub',
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD,
  });

  try {
    const users = await pool.query('SELECT id, email, first_name, last_name FROM users');
    console.log('--- USERS ---');
    console.table(users.rows);

    const players = await pool.query('SELECT id, first_name, last_name, user_id, club_id FROM players');
    console.log('\n--- PLAYERS ---');
    console.table(players.rows);

    const members = await pool.query('SELECT * FROM organization_members');
    console.log('\n--- ORG MEMBERS ---');
    console.table(members.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
