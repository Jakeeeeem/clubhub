const { pool } = require('./config/database');

async function clearUserPreference() {
    const client = await pool.connect();
    try {
        // Clear the saved organization preference for demo-admin
        const result = await client.query(`
            UPDATE user_preferences 
            SET current_organization_id = NULL 
            WHERE user_id = (SELECT id FROM users WHERE email = 'demo-admin@clubhub.com')
            RETURNING *
        `);
        
        console.log('✅ Cleared organization preference for demo-admin@clubhub.com');
        console.log('Rows updated:', result.rowCount);
        
    } finally {
        client.release();
        await pool.end();
    }
}

clearUserPreference().catch(console.error);
