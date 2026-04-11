const { query } = require('../config/database');

async function fix() {
  const masterId = 'c403dbdc-a2fb-4327-a452-705c59877e61';
  const clubRes = await query('SELECT id FROM organizations WHERE owner_id = $1 LIMIT 1', [masterId]);
  
  if (clubRes.rows.length === 0) {
    console.error('No club found for master');
    process.exit(1);
  }
  
  const clubId = clubRes.rows[0].id;
  
  await query(
    'INSERT INTO staff (user_id, club_id, first_name, last_name, email, role, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (user_id, club_id) DO NOTHING',
    [masterId, clubId, 'Master', 'Coach', 'master@demo.com', 'coach', true]
  );
  
  console.log('✅ Master User linked as Head Coach in club:', clubId);
  process.exit(0);
}

fix().catch(e => {
  console.error(e);
  process.exit(1);
});
