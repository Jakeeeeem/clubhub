const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
};

console.log('Testing connection with:', { ...dbConfig, password: '***' });

const pool = new Pool(dbConfig);

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
  console.log('✅ Connection successful!');
  client.query('SELECT current_database(), current_user', (err, result) => {
    release();
    if (err) {
      console.error('❌ Query failed:', err.message);
    } else {
      console.log('Result:', result.rows[0]);
    }
    process.exit(0);
  });
});
