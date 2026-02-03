-- Revert finalize
DROP TRIGGER IF EXISTS trigger_sync_org_to_club ON organizations;
DROP FUNCTION IF EXISTS sync_org_to_club();

-- Reverting FKs is complex and usually not recommended for down migrations 
-- unless specifically needed. We'll leave them pointing to organizations 
-- as it's the new standard.
