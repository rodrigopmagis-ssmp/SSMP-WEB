-- Create clinic_business_hours table
-- Stores business hours for each clinic by day of week
-- Supports multiple time ranges per day (e.g., morning and afternoon shifts)

CREATE TABLE IF NOT EXISTS clinic_business_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 1=Segunda, ..., 6=Sábado
  is_active BOOLEAN DEFAULT true,
  time_ranges JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "19:00"}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_hours_clinic ON clinic_business_hours(clinic_id);

-- Create unique constraint to prevent duplicate day_of_week entries per clinic
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_hours_clinic_day ON clinic_business_hours(clinic_id, day_of_week);

-- Add RLS policies
ALTER TABLE clinic_business_hours ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view business hours for their clinic
CREATE POLICY "Users can view business hours for their clinic"
  ON clinic_business_hours
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert business hours for their clinic
CREATE POLICY "Users can insert business hours for their clinic"
  ON clinic_business_hours
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update business hours for their clinic
CREATE POLICY "Users can update business hours for their clinic"
  ON clinic_business_hours
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete business hours for their clinic
CREATE POLICY "Users can delete business hours for their clinic"
  ON clinic_business_hours
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_hours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_hours_updated_at
  BEFORE UPDATE ON clinic_business_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_business_hours_updated_at();
