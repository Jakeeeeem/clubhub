const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is platform admin
const requirePlatformAdmin = async (req, res, next) => {
    try {
        const result = await query(
            'SELECT is_platform_admin FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!result.rows[0].is_platform_admin) {
            return res.status(403).json({ 
                error: 'Forbidden',
                message: 'Platform admin access required'
            });
        }

        next();
    } catch (error) {
        console.error('Platform admin check error:', error);
        res.status(500).json({ error: 'Failed to verify admin status' });
    }
};

// GET /api/platform-admin/stats - Platform-wide statistics
router.get('/stats', authenticateToken, requirePlatformAdmin, async (req, res) => {
    try {
        // Get total counts
        const stats = await query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM organizations) as total_organizations,
                (SELECT COUNT(*) FROM organization_members) as total_memberships,
                (SELECT COUNT(*) FROM invitations WHERE status = 'pending') as pending_invitations,
                (SELECT COUNT(*) FROM plans WHERE active = true) as active_plans
        `);

        // Get recent signups (last 30 days)
        const recentSignups = await query(`
            SELECT COUNT(*) as count
            FROM users
            WHERE created_at >= NOW() - INTERVAL '30 days'
        `);

        // Get organizations by sport
        const orgsBySport = await query(`
            SELECT sport, COUNT(*) as count
            FROM organizations
            GROUP BY sport
            ORDER BY count DESC
        `);

        // Get user growth (last 7 days)
        const userGrowth = await query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM users
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        res.json({
            stats: stats.rows[0],
            recentSignups: recentSignups.rows[0].count,
            orgsBySport: orgsBySport.rows,
            userGrowth: userGrowth.rows
        });

    } catch (error) {
        console.error('Get platform stats error:', error);
        res.status(500).json({ error: 'Failed to fetch platform statistics' });
    }
});

// GET /api/platform-admin/organizations - All organizations
router.get('/organizations', authenticateToken, requirePlatformAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const offset = (page - 1) * limit;

        let queryText = `
            SELECT 
                o.*,
                u.email as owner_email,
                u.first_name as owner_first_name,
                u.last_name as owner_last_name,
                (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) as member_count
            FROM organizations o
            LEFT JOIN users u ON o.owner_id = u.id
        `;

        const params = [];
        
        if (search) {
            queryText += ` WHERE o.name ILIKE $1 OR o.slug ILIKE $1`;
            params.push(`%${search}%`);
        }

        queryText += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const organizations = await query(queryText, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM organizations';
        if (search) {
            countQuery += ` WHERE name ILIKE $1 OR slug ILIKE $1`;
        }
        const totalCount = await query(countQuery, search ? [`%${search}%`] : []);

        res.json({
            organizations: organizations.rows,
            total: parseInt(totalCount.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Get all organizations error:', error);
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
});

// GET /api/platform-admin/users - All users
router.get('/users', authenticateToken, requirePlatformAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', accountType = '' } = req.query;
        const offset = (page - 1) * limit;

        let queryText = `
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.account_type,
                u.created_at,
                u.is_platform_admin,
                (SELECT COUNT(*) FROM organization_members WHERE user_id = u.id) as org_count
            FROM users u
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            queryText += ` AND (u.email ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        if (accountType) {
            paramCount++;
            queryText += ` AND u.account_type = $${paramCount}`;
            params.push(accountType);
        }

        queryText += ` ORDER BY u.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const users = await query(queryText, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
        const countParams = [];
        let countParamCount = 0;

        if (search) {
            countParamCount++;
            countQuery += ` AND (email ILIKE $${countParamCount} OR first_name ILIKE $${countParamCount} OR last_name ILIKE $${countParamCount})`;
            countParams.push(`%${search}%`);
        }

        if (accountType) {
            countParamCount++;
            countQuery += ` AND account_type = $${countParamCount}`;
            countParams.push(accountType);
        }

        const totalCount = await query(countQuery, countParams);

        res.json({
            users: users.rows,
            total: parseInt(totalCount.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET /api/platform-admin/organization/:id - Single organization details
router.get('/organization/:id', authenticateToken, requirePlatformAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Get organization details
        const org = await query(`
            SELECT 
                o.*,
                u.email as owner_email,
                u.first_name as owner_first_name,
                u.last_name as owner_last_name
            FROM organizations o
            LEFT JOIN users u ON o.owner_id = u.id
            WHERE o.id = $1
        `, [id]);

        if (org.rows.length === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Get members
        const members = await query(`
            SELECT 
                om.*,
                u.email,
                u.first_name,
                u.last_name
            FROM organization_members om
            JOIN users u ON om.user_id = u.id
            WHERE om.organization_id = $1
            ORDER BY 
                CASE om.role
                    WHEN 'owner' THEN 1
                    WHEN 'admin' THEN 2
                    WHEN 'coach' THEN 3
                    WHEN 'player' THEN 4
                    ELSE 5
                END
        `, [id]);

        // Get payment plans
        const plans = await query(`
            SELECT * FROM plans
            WHERE organization_id = $1
            ORDER BY created_at DESC
        `, [id]);

        res.json({
            organization: org.rows[0],
            members: members.rows,
            plans: plans.rows
        });

    } catch (error) {
        console.error('Get organization details error:', error);
        res.status(500).json({ error: 'Failed to fetch organization details' });
    }
});

// POST /api/platform-admin/set-admin/:userId - Make user platform admin
router.post('/set-admin/:userId', authenticateToken, requirePlatformAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { isPlatformAdmin } = req.body;

        await query(`
            UPDATE users 
            SET is_platform_admin = $1, updated_at = NOW()
            WHERE id = $2
        `, [isPlatformAdmin, userId]);

        res.json({
            success: true,
            message: `User ${isPlatformAdmin ? 'granted' : 'revoked'} platform admin access`
        });

    } catch (error) {
        console.error('Set platform admin error:', error);
        res.status(500).json({ error: 'Failed to update admin status' });
    }
});

// GET /api/platform-admin/activity - Recent platform activity
router.get('/activity', authenticateToken, requirePlatformAdmin, async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        // Get recent organizations
        const recentOrgs = await query(`
            SELECT 
                'organization_created' as type,
                o.name as title,
                o.created_at as timestamp,
                u.email as user_email
            FROM organizations o
            LEFT JOIN users u ON o.owner_id = u.id
            ORDER BY o.created_at DESC
            LIMIT $1
        `, [limit]);

        // Get recent users
        const recentUsers = await query(`
            SELECT 
                'user_registered' as type,
                CONCAT(first_name, ' ', last_name) as title,
                created_at as timestamp,
                email as user_email
            FROM users
            ORDER BY created_at DESC
            LIMIT $1
        `, [limit]);

        // Get recent invitations
        const recentInvites = await query(`
            SELECT 
                'invitation_sent' as type,
                CONCAT('Invited to ', o.name) as title,
                i.created_at as timestamp,
                i.email as user_email
            FROM invitations i
            LEFT JOIN organizations o ON i.organization_id = o.id
            ORDER BY i.created_at DESC
            LIMIT $1
        `, [limit]);

        // Combine and sort
        const allActivity = [
            ...recentOrgs.rows,
            ...recentUsers.rows,
            ...recentInvites.rows
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
         .slice(0, limit);

        res.json({
            activity: allActivity
        });

    } catch (error) {
        console.error('Get platform activity error:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

module.exports = router;
