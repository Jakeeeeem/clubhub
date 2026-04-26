-- Create bib_inventory table
CREATE TABLE IF NOT EXISTS bib_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    color VARCHAR(50) NOT NULL,
    total_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    price DECIMAL(10, 2) DEFAULT 0.00,
    stripe_product_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(club_id, color)
);

-- Add entry_price and stripe_product_id to venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS entry_price DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255);

-- Add stripe_product_id to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255);

-- Create trigger for updated_at on bib_inventory
CREATE TRIGGER update_bib_inventory_updated_at 
BEFORE UPDATE ON bib_inventory 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
