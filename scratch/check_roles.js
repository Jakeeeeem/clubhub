const { pool } = require('./backend/config/database');

async function checkOwnerRole() {
  try {
    const email = 'instantonlinesuccess@gmail.com';
    console.log(`Checking roles for ${email}...`);
    
    const result = await pool.query(`
      SELECT 
        om.organization_id, 
        o.name as org_name,
        om.user_id, 
        om.role as om_role, 
        p.id as player_id,
        p.role as p_role
      FROM organization_members om
      JOIN users u ON om.user_id = u.id
      JOIN organizations o ON om.organization_id = o.id
      LEFT JOIN players p ON p.user_id = u.id AND p.club_id = om.organization_id
      WHERE u.email = $1
    `, [email]);

    console.log('Results:');
    console.table(result.rows);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkOwnerRole();
