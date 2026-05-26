require('dotenv').config({ path: '/Users/christopherjcallaghan/Documents/sites/clubhub/.env' });
const { pool } = require('../config/database');

(async () => {
  try {
    const orgId = 'c4c0c1cc-7824-4693-8155-e3fd1af56192'; // johndoe87bsssabys-club
    console.log('Testing organization members query for orgId:', orgId);
    
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.id as user_id,
        u.first_name, 
        u.last_name, 
        u.email, 
        om.role,
        om.status
      FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = $1 AND om.status IN ('active', 'pending', 'cancelled')
    `, [orgId]);
    console.log('organization_members count:', result.rows.length);

    const playersResult = await pool.query(
      `SELECT
         p.id as player_id, p.user_id, p.first_name, p.last_name, p.email, p.club_id, p.payment_status,
         pl.name as plan_name, pl.price as plan_amount, pl.interval as plan_interval
       FROM players p
       LEFT JOIN plans pl ON pl.id = p.payment_plan_id
       WHERE p.club_id = $1`,
      [orgId]
    );
    console.log('players count:', playersResult.rows.length);
    console.log('players samples:', playersResult.rows.slice(0, 3));

    const invitesResult = await pool.query(
      `SELECT 
         i.id as invite_id, i.email, i.first_name, i.last_name, i.role as invite_role, i.status as invite_status, i.team_id,
         pl.name as plan_name, pl.price as plan_amount, pl.interval as plan_interval
       FROM invitations i
       LEFT JOIN plans pl ON pl.id = i.payment_plan_id
       WHERE i.organization_id = $1 AND i.status = 'pending'`,
      [orgId]
    );
    console.log('invites count:', invitesResult.rows.length);
    console.log('invites samples:', invitesResult.rows.slice(0, 3));

    process.exit(0);
  } catch(e) {
    console.error('Query test failed:', e);
    process.exit(1);
  }
})();
