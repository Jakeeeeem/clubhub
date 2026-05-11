const { pool } = require('./backend/config/database');

async function testMembersApi() {
  try {
    const orgId = '2f81f295-1e7a-4874-a360-64ab0edde681'; // 'Christopher Callaghan test'
    
    console.log(`Testing Members logic for org ${orgId}...`);
    
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.first_name, 
        u.last_name, 
        u.email, 
        om.role,
        om.status
      FROM organization_members om
      INNER JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = $1 AND om.status = 'active'
    `, [orgId]);

    const playersResult = await pool.query(
      `SELECT p.id as player_id, p.user_id, p.first_name, p.last_name, p.email, p.club_id
       FROM players p
       WHERE p.club_id = $1`,
      [orgId]
    );

    const membersByKey = new Map();
    function addMemberRow(r) {
      const key = r.user_id || r.email || r.id || r.player_id;
      if (!key) return;
      if (!membersByKey.has(String(key))) membersByKey.set(String(key), r);
      else {
        const existing = membersByKey.get(String(key));
        membersByKey.set(String(key), Object.assign({}, r, existing));
      }
    }

    result.rows.forEach(addMemberRow);
    playersResult.rows.forEach(r => {
      const normalized = {
        id: r.user_id || r.player_id,
        user_id: r.user_id,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        role: 'player',
        status: 'active'
      };
      addMemberRow(normalized);
    });

    const members = Array.from(membersByKey.values());
    const players = members.filter(m => (m.role || '').toString() === 'player');
    const staff = members.filter(m => ['coach', 'assistant-coach', 'staff', 'admin', 'owner', 'manager'].includes((m.role || '').toString()));

    console.log('Total members:', members.length);
    console.log('Staff count:', staff.length);
    console.log('Players count:', players.length);
    console.log('Staff details:');
    console.table(staff);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testMembersApi();
