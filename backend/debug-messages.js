require('dotenv').config();
const { pool } = require('./config/database');

async function checkMessages() {
    try {
        const adminRes = await pool.query("SELECT id, email FROM users WHERE email = 'demo-admin@clubhub.com'");
        const adminId = adminRes.rows[0]?.id;
        console.log('Admin ID:', adminId);

        const msgRes = await pool.query("SELECT * FROM messages WHERE sender_id = $1 OR receiver_id = $1", [adminId]);
        console.log('Messages found:', msgRes.rows.length);
        if (msgRes.rows.length > 0) {
            console.log('Sample Message:', msgRes.rows[0]);
        }
        
        const orgRes = await pool.query("SELECT * FROM organization_members WHERE user_id = $1", [adminId]);
        console.log('Org Memberships:', orgRes.rows.map(r => ({ org: r.organization_id, role: r.role })));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkMessages();
