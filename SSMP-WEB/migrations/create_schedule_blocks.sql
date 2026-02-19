-- Create schedule_blocks table
-- Stores schedule blocks (time blocking) for clinics and professionals

CREATE TABLE IF NOT EXISTS schedule_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_clinic_wide BOOLEAN DEFAULT false, -- When true, blocks all professionals
  is_full_day BOOLEAN DEFAULT false, -- When true, blocks entire business hours
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_blocks_clinic ON schedule_blocks(clinic_id);
CREATE INDEX IF NOT EXISTS idx_blocks_professional ON schedule_blocks(professional_id);
CREATE INDEX IF NOT EXISTS idx_blocks_clinic_date ON schedule_blocks(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_blocks_date_range ON schedule_blocks(date, start_time, end_time);

-- Add constraint: if is_clinic_wide is true, professional_id must be null
ALTER TABLE schedule_blocks ADD CONSTRAINT check_clinic_wide_no_professional
  CHECK (
    (is_clinic_wide = false) OR 
    (is_clinic_wide = true AND professional_id IS NULL)
  );

-- Add RLS policies
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view schedule blocks for their clinic
CREATE POLICY "Users can view schedule blocks for their clinic"
  ON schedule_blocks
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert schedule blocks for their clinic
CREATE POLICY "Users can insert schedule blocks for their clinic"
  ON schedule_blocks
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update schedule blocks for their clinic
CREATE POLICY "Users can update schedule blocks for their clinic"
  ON schedule_blocks
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete schedule blocks for their clinic
CREATE POLICY "Users can delete schedule blocks for their clinic"
  ON schedule_blocks
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schedule_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_schedule_blocks_updated_at
  BEFORE UPDATE ON schedule_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_blocks_updated_at();
