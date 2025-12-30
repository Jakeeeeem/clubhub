-- Add custom_fields to products (JSONB array of field definitions)
ALTER TABLE products ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

-- Add customization_details to product_orders (JSONB object of user answers)
ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS customization_details JSONB DEFAULT '{}'::jsonb;
