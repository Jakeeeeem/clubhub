const { pool } = require('./config/database');

async function testContext() {
    const client = await pool.connect();
    try {
        // Get user
        const userRes = await client.query(`
            SELECT u.id, u.email, u.first_name, u.last_name, u.account_type, up.current_organization_id
            FROM users u
            LEFT JOIN user_preferences up ON u.id = up.user_id
            WHERE u.email = 'demo-admin@clubhub.com'
        `);
        
        const user = userRes.rows[0];
        console.log('👤 User:', {
            id: user.id,
            email: user.email,
            account_type: user.account_type,
            saved_org_id: user.current_organization_id
        });
        
        // Get organizations
        const orgsRes = await client.query(`
            SELECT o.id, o.name, o.sport, o.location, o.logo_url, om.role, om.status
            FROM organizations o
            INNER JOIN organization_members om ON o.id = om.organization_id
            WHERE om.user_id = $1 AND om.status = 'active'
            ORDER BY o.name
        `, [user.id]);
        
        console.log('\n🏢 Organizations:');
        orgsRes.rows.forEach(org => {
            console.log(`  - ${org.name} (${org.role})`);
        });
        
        // Apply prioritization logic
        let currentOrg = null;
        
        if (user.current_organization_id) {
            currentOrg = orgsRes.rows.find(o => o.id === user.current_organization_id);
            if (currentOrg) {
                console.log('\n📌 Using saved preference:', currentOrg.name);
            }
        }
        
        if (!currentOrg && orgsRes.rows.length > 0) {
            if (user.account_type === 'organization') {
                console.log('\n🔍 Looking for owner/admin org...');
                currentOrg = orgsRes.rows.find(o => ['owner', 'admin'].includes(o.role));
                if (currentOrg) {
                    console.log('👑 Found owner/admin org:', currentOrg.name, `(${currentOrg.role})`);
                }
            }
            
            if (!currentOrg) {
                currentOrg = orgsRes.rows[0];
                console.log('\n📍 Fallback to first org:', currentOrg.name);
            }
        }
        
        console.log('\n✅ Final selected org:', {
            id: currentOrg.id,
            name: currentOrg.name,
            role: currentOrg.role
        });
        
    } finally {
        client.release();
        await pool.end();
    }
}

testContext().catch(console.error);
