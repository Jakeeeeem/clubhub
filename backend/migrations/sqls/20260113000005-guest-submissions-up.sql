-- Guest submissions for events

CREATE TABLE IF NOT EXISTS guest_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    date_of_birth DATE,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    additional_info JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_submissions_event ON guest_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_submissions_email ON guest_submissions(email);

COMMENT ON TABLE guest_submissions IS 'Guest player information submitted for events';
