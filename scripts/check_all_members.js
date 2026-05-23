const { pool } = require('./backend/config/database');

async function checkAllMembers() {
  try {
    const orgIds = [
      '7e0569fb-c741-40df-bc2d-0b8f6f3edf15',
      '2f81f295-1e7a-4874-a360-64ab0edde681',
      '223de646-383d-433d-a0a2-27ab0e0c8434'
    ];
    
    for (const orgId of orgIds) {
      console.log(`\n--- Members for Org: ${orgId} ---`);
      
      const omResult = await pool.query(`
        SELECT om.user_id, u.email, om.role, om.status
        FROM organization_members om
        JOIN users u ON om.user_id = u.id
        WHERE om.organization_id = $1
      `, [orgId]);
      
      console.log('organization_members:');
      console.table(omResult.rows);
      
      const pResult = await pool.query(`
        SELECT p.id, p.user_id, p.email, p.first_name, p.last_name
        FROM players p
        WHERE p.club_id = $1
      `, [orgId]);
      
      console.log('players table:');
      console.table(pResult.rows);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAllMembers();
