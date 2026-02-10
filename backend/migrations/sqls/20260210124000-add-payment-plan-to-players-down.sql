ALTER TABLE players 
DROP COLUMN IF EXISTS payment_plan_id,
DROP COLUMN IF EXISTS plan_price,
DROP COLUMN IF EXISTS plan_start_date;
