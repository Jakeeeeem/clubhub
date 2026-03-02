-- Down Migration: Custom Form Builder
ALTER TABLE events DROP COLUMN IF EXISTS custom_form_id;

DROP TABLE IF EXISTS custom_form_responses;
DROP TABLE IF EXISTS custom_form_fields;
DROP TABLE IF EXISTS custom_forms;
