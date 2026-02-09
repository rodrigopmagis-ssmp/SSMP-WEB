-- Migration: Create ombudsman_contacts table
-- Description: Stores contact history with patients for complaints

CREATE TABLE IF NOT EXISTS ombudsman_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES ombudsman_complaints(id) ON DELETE CASCADE,
    contact_type VARCHAR(50) NOT NULL CHECK (contact_type IN ('outgoing', 'incoming')),
    contact_method VARCHAR(50) NOT NULL CHECK (contact_method IN ('phone', 'whatsapp', 'email', 'in_person')),
    message TEXT NOT NULL,
    response TEXT,
    contacted_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    response_status VARCHAR(20) CHECK (response_status IN ('pending', 'responded', 'no_response')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ombudsman_contacts_complaint_id ON ombudsman_contacts(complaint_id);
CREATE INDEX IF NOT EXISTS idx_ombudsman_contacts_contacted_at ON ombudsman_contacts(contacted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ombudsman_contacts_response_status ON ombudsman_contacts(response_status);

-- Add comments for documentation
COMMENT ON TABLE ombudsman_contacts IS 'Contact history with patients for ombudsman complaints';
COMMENT ON COLUMN ombudsman_contacts.contact_type IS 'Type of contact: outgoing (we contacted) or incoming (patient contacted)';
COMMENT ON COLUMN ombudsman_contacts.contact_method IS 'Method used: phone, whatsapp, email, in_person';
COMMENT ON COLUMN ombudsman_contacts.response_status IS 'Status: pending, responded, no_response';

-- Enable RLS
ALTER TABLE ombudsman_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view contacts from their clinic"
    ON ombudsman_contacts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ombudsman_complaints oc
            WHERE oc.id = ombudsman_contacts.complaint_id
            AND oc.clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can insert contacts for their clinic"
    ON ombudsman_contacts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ombudsman_complaints oc
            WHERE oc.id = ombudsman_contacts.complaint_id
            AND oc.clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can update contacts from their clinic"
    ON ombudsman_contacts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM ombudsman_complaints oc
            WHERE oc.id = ombudsman_contacts.complaint_id
            AND oc.clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
        )
    );
