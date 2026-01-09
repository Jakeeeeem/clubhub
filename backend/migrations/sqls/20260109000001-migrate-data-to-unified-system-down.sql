-- Rollback data migration (clears migrated data but keeps old tables intact)

DELETE FROM user_preferences WHERE user_id IN (SELECT id FROM users);
DELETE FROM organization_members;
DELETE FROM organizations;
