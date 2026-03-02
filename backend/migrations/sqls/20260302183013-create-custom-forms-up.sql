-- Up Migration: Custom Form Builder
CREATE TABLE IF NOT EXISTS custom_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_form_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'date', 'select', 'checkbox', 'textarea'
    is_required BOOLEAN DEFAULT FALSE,
    options JSONB, -- For select/checkbox options
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_form_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Optional, can be guest
    event_id UUID REFERENCES events(id) ON DELETE SET NULL, -- Optional, if linked to event
    response_data JSONB NOT NULL, -- Actual form data
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add form_id to events to allow linking a custom form to an event
ALTER TABLE events ADD COLUMN IF NOT EXISTS custom_form_id UUID REFERENCES custom_forms(id) ON DELETE SET NULL;

-- Trigger for updated_at on custom_forms
CREATE TRIGGER update_custom_forms_updated_at 
BEFORE UPDATE ON custom_forms 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
