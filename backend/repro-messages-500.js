const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { pool } = require("./config/database");

async function testMessages() {
  try {
    const email = 'demo-admin@clubhub.com';
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      console.log('User not found');
      return;
    }
    const userId = userRes.rows[0].id;
    
    // Get organization
    const orgRes = await pool.query('SELECT organization_id FROM organization_members WHERE user_id = $1 LIMIT 1', [userId]);
    if (orgRes.rows.length === 0) {
      console.log('No organization found for user');
      return;
    }
    const orgId = orgRes.rows[0].organization_id;
    
    console.log(`Testing with UserID: ${userId}, OrgID: ${orgId}`);
    
    const result = await pool.query(
      `SELECT m.*, 
              u.first_name || ' ' || u.last_name as sender_name,
              target.first_name || ' ' || target.last_name as receiver_name
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       LEFT JOIN users target ON m.receiver_id = target.id
       WHERE m.organization_id = $2
         AND (
           m.type = 'announcement'
           OR m.sender_id = $1
           OR m.receiver_id = $1
         )
       ORDER BY m.created_at DESC`,
      [userId, orgId]
    );
    
    console.log('Success!', result.rows.length, 'messages found');
  } catch (error) {
    console.error('FAILED:', error);
  } finally {
    pool.end();
  }
}

testMessages();
