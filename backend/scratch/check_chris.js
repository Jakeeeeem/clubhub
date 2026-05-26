require('dotenv').config({ path: '/Users/christopherjcallaghan/Documents/sites/clubhub/.env' });
const { pool } = require('../config/database');

(async () => {
  try {
    const res = await pool.query("SELECT id, email, first_name, last_name, status, organization_id FROM invitations ORDER BY created_at DESC LIMIT 10");
    console.log('Recent Invitations:', res.rows);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
