-- Fix the sync trigger to handle the 'types' column
CREATE OR REPLACE FUNCTION sync_org_to_club() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO clubs (id, name, description, location, sport, owner_id, created_at, updated_at, types)
    VALUES (NEW.id, NEW.name, NEW.description, NEW.location, NEW.sport, NEW.owner_id, NEW.created_at, NEW.updated_at, COALESCE(NEW.types, ARRAY[]::TEXT[]))
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        location = EXCLUDED.location,
        sport = EXCLUDED.sport,
        types = COALESCE(EXCLUDED.types, ARRAY[]::TEXT[]),
        updated_at = EXCLUDED.updated_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
