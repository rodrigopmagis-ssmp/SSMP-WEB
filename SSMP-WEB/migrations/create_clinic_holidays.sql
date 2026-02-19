-- Create clinic_holidays table
-- Stores holidays and special closure dates for each clinic

CREATE TABLE IF NOT EXISTS clinic_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_holidays_clinic ON clinic_holidays(clinic_id);
CREATE INDEX IF NOT EXISTS idx_holidays_clinic_date ON clinic_holidays(clinic_id, date);

-- Add RLS policies
ALTER TABLE clinic_holidays ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view holidays for their clinic
CREATE POLICY "Users can view holidays for their clinic"
  ON clinic_holidays
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert holidays for their clinic
CREATE POLICY "Users can insert holidays for their clinic"
  ON clinic_holidays
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update holidays for their clinic
CREATE POLICY "Users can update holidays for their clinic"
  ON clinic_holidays
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete holidays for their clinic
CREATE POLICY "Users can delete holidays for their clinic"
  ON clinic_holidays
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );
