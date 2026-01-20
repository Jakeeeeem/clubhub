-- Check what organizations demo-admin@clubhub.com belongs to
SELECT 
    u.email,
    u.account_type,
    o.name as org_name,
    om.role,
    om.status
FROM users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'demo-admin@clubhub.com'
ORDER BY om.role DESC, o.name;

-- Check user preferences
SELECT 
    u.email,
    up.current_organization_id,
    o.name as current_org_name
FROM users u
LEFT JOIN user_preferences up ON u.id = up.user_id
LEFT JOIN organizations o ON up.current_organization_id = o.id
WHERE u.email = 'demo-admin@clubhub.com';
