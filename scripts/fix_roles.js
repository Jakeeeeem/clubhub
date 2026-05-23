const { pool } = require('./backend/config/database');

async function fixRoles() {
  try {
    const email = 'instantonlinesuccess@gmail.com';
    console.log(`Fixing roles for ${email}...`);
    
    const result = await pool.query(`
      UPDATE organization_members
      SET role = 'owner'
      WHERE user_id IN (SELECT id FROM users WHERE email = $1)
    `, [email]);

    console.log(`Updated ${result.rowCount} rows.`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixRoles();
