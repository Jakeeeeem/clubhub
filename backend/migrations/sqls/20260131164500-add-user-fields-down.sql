ALTER TABLE users 
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS date_of_birth,
DROP COLUMN IF EXISTS email_recovery_enabled,
DROP COLUMN IF EXISTS auto_payments_enabled,
DROP COLUMN IF EXISTS payment_reminders_enabled,
DROP COLUMN IF EXISTS receipt_emails_enabled;
