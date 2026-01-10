-- Demo Organization Setup for Unified Account System
-- Creates a demo organization and assigns demo users with proper roles

-- 1. Create Demo Organization
INSERT INTO organizations (
  id,
  name,
  slug,
  sport,
  location,
  description,
  owner_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Demo Sports Club',
  'demo-sports-club',
  'Football',
  'London, UK',
  'Demo organization for testing and demonstrations',
  (SELECT id FROM users WHERE email = 'demo-admin@clubhub.com' LIMIT 1),
  NOW(),
  NOW()
) ON CONFLICT (slug) DO NOTHING
RETURNING id;

-- Store the organization ID for later use
DO $$
DECLARE
  demo_org_id UUID;
  demo_admin_id UUID;
  demo_coach_id UUID;
  demo_player_id UUID;
BEGIN
  -- Get organization ID
  SELECT id INTO demo_org_id FROM organizations WHERE slug = 'demo-sports-club';
  
  -- Get user IDs
  SELECT id INTO demo_admin_id FROM users WHERE email = 'demo-admin@clubhub.com';
  SELECT id INTO demo_coach_id FROM users WHERE email = 'demo-coach@clubhub.com';
  SELECT id INTO demo_player_id FROM users WHERE email = 'demo-player@clubhub.com';

  -- 2. Add Demo Admin as Owner
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status,
    joined_at
  ) VALUES (
    demo_org_id,
    demo_admin_id,
    'owner',
    'active',
    NOW()
  ) ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = 'owner', status = 'active';

  -- 3. Add Demo Coach as Coach
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status,
    joined_at
  ) VALUES (
    demo_org_id,
    demo_coach_id,
    'coach',
    'active',
    NOW()
  ) ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = 'coach', status = 'active';

  -- 4. Add Demo Player as Player
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status,
    joined_at
  ) VALUES (
    demo_org_id,
    demo_player_id,
    'player',
    'active',
    NOW()
  ) ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = 'player', status = 'active';

  -- 5. Set Demo Sports Club as default organization for all demo users
  INSERT INTO user_preferences (user_id, current_organization_id)
  VALUES 
    (demo_admin_id, demo_org_id),
    (demo_coach_id, demo_org_id),
    (demo_player_id, demo_org_id)
  ON CONFLICT (user_id) DO UPDATE
  SET current_organization_id = EXCLUDED.current_organization_id;

  RAISE NOTICE 'Demo organization setup complete!';
  RAISE NOTICE 'Organization ID: %', demo_org_id;
  RAISE NOTICE 'Demo Admin: % (owner)', demo_admin_id;
  RAISE NOTICE 'Demo Coach: % (coach)', demo_coach_id;
  RAISE NOTICE 'Demo Player: % (player)', demo_player_id;
END $$;

-- 6. Verify setup
SELECT 
  o.name as organization,
  o.slug,
  u.email,
  om.role,
  om.status
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
JOIN users u ON om.user_id = u.id
WHERE o.slug = 'demo-sports-club'
ORDER BY 
  CASE om.role
    WHEN 'owner' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'coach' THEN 3
    WHEN 'player' THEN 4
    ELSE 5
  END;
