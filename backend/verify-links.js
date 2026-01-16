const { pool } = require('./config/database');

async function verify() {
    try {
        const res = await pool.query(`
            SELECT u.email, o.name, om.role 
            FROM users u 
            JOIN organization_members om ON u.id = om.user_id 
            JOIN organizations o ON om.organization_id = o.id 
            WHERE u.email = 'demo-admin@clubhub.com'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

verify();
