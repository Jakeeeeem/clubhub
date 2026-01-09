-- Data Migration: Move existing clubs and users to new unified system
-- This migration is SAFE and non-destructive (keeps old tables)

-- ============================================================================
-- 1. MIGRATE CLUBS TO ORGANIZATIONS
-- ============================================================================
INSERT INTO organizations (
    id,
    name,
    slug,
    description,
    sport,
    location,
    website,
    established,
    stripe_account_id,
    owner_id,
    member_count,
    is_active,
    created_at,
    updated_at
)
SELECT 
    c.id,
    c.name,
    -- Generate slug from name (lowercase, replace spaces/special chars with hyphens)
    LOWER(REGEXP_REPLACE(
        REGEXP_REPLACE(c.name, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
    )),
    c.description,
    c.sport,
    c.location,
    c.website,
    c.established,
    NULL as stripe_account_id,  -- Will be set later if exists
    c.owner_id,
    c.member_count,
    true as is_active,
    c.created_at,
    c.updated_at
FROM clubs c
WHERE NOT EXISTS (
    SELECT 1 FROM organizations o WHERE o.id = c.id
);

-- ============================================================================
-- 2. MIGRATE CLUB OWNERS AS ORGANIZATION OWNERS
-- ============================================================================
INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status,
    joined_at,
    created_at
)
SELECT 
    c.id as organization_id,
    c.owner_id as user_id,
    'owner' as role,
    'active' as status,
    c.created_at as joined_at,
    NOW() as created_at
FROM clubs c
WHERE NOT EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = c.id 
    AND om.user_id = c.owner_id
);

-- ============================================================================
-- 3. MIGRATE PLAYERS TO ORGANIZATION MEMBERS
-- ============================================================================
INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status,
    position,
    jersey_number,
    date_of_birth,
    joined_at,
    created_at
)
SELECT 
    p.club_id as organization_id,
    p.user_id,
    'player' as role,
    'active' as status,
    p.position,
    NULL as jersey_number,  -- Will be set from team_players if exists
    p.date_of_birth,
    p.join_date as joined_at,
    NOW() as created_at
FROM players p
WHERE p.user_id IS NOT NULL
AND p.club_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = p.club_id 
    AND om.user_id = p.user_id
);

-- ============================================================================
-- 4. MIGRATE STAFF TO ORGANIZATION MEMBERS
-- ============================================================================
INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status,
    joined_at,
    created_at
)
SELECT 
    s.club_id as organization_id,
    s.user_id,
    -- Map old staff roles to new system
    CASE 
        WHEN s.role = 'coach' THEN 'coach'
        WHEN s.role = 'assistant-coach' THEN 'assistant_coach'
        WHEN s.role IN ('treasurer', 'administrator') THEN 'staff'
        ELSE 'staff'
    END as role,
    'active' as status,
    s.join_date as joined_at,
    NOW() as created_at
FROM staff s
WHERE s.user_id IS NOT NULL
AND s.club_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = s.club_id 
    AND om.user_id = s.user_id
);

-- ============================================================================
-- 5. CREATE USER PREFERENCES FOR EXISTING USERS
-- ============================================================================
INSERT INTO user_preferences (
    user_id,
    current_organization_id,
    created_at
)
SELECT 
    u.id as user_id,
    -- Set their first organization as current
    (
        SELECT om.organization_id 
        FROM organization_members om 
        WHERE om.user_id = u.id 
        ORDER BY om.joined_at ASC 
        LIMIT 1
    ) as current_organization_id,
    NOW() as created_at
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences up WHERE up.user_id = u.id
);

-- ============================================================================
-- 6. UPDATE ORGANIZATION MEMBER COUNTS
-- ============================================================================
UPDATE organizations o
SET member_count = (
    SELECT COUNT(*) 
    FROM organization_members om 
    WHERE om.organization_id = o.id 
    AND om.status = 'active'
);

-- ============================================================================
-- 7. HANDLE DUPLICATE SLUGS (if any)
-- ============================================================================
-- Add a number suffix to duplicate slugs
WITH duplicates AS (
    SELECT slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
    FROM organizations
)
UPDATE organizations o
SET slug = o.slug || '-' || d.rn
FROM duplicates d
WHERE o.slug = d.slug AND d.rn > 1;

-- ============================================================================
-- VERIFICATION QUERIES (run these to check migration)
-- ============================================================================

-- Check organization count
-- SELECT COUNT(*) as org_count FROM organizations;

-- Check member count
-- SELECT COUNT(*) as member_count FROM organization_members;

-- Check role distribution
-- SELECT role, COUNT(*) as count 
-- FROM organization_members 
-- GROUP BY role 
-- ORDER BY count DESC;

-- Check users with multiple organizations
-- SELECT user_id, COUNT(*) as org_count 
-- FROM organization_members 
-- GROUP BY user_id 
-- HAVING COUNT(*) > 1;

-- Check orphaned users (users with no organization)
-- SELECT u.id, u.email, u.first_name, u.last_name
-- FROM users u
-- WHERE NOT EXISTS (
--     SELECT 1 FROM organization_members om WHERE om.user_id = u.id
-- );
