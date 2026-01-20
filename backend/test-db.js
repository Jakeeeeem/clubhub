const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'clubhub-dev.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
});

async function run() {
  try {
    const players = await pool.query('SELECT * FROM players');
    console.log('PLAYERS COUNT:', players.rows.length);
    console.table(players.rows.map(p => ({ id: p.id, name: p.first_name, user_id: p.user_id })));

    const users = await pool.query('SELECT * FROM users');
    console.log('USERS COUNT:', users.rows.length);
    console.table(users.rows.map(u => ({ id: u.id, email: u.email })));

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
