-- Create treatment_logs table
-- Using patient_treatments as the reference table
CREATE TABLE IF NOT EXISTS treatment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_id UUID NOT NULL REFERENCES patient_treatments(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE treatment_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow viewing logs if you can view the treatment
CREATE POLICY "Users can view logs" ON treatment_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM patient_treatments t WHERE t.id = treatment_logs.treatment_id
    -- Add auth check if patient_treatments has RLS based on user_id, assuming it handles tenant logic
  ));

CREATE POLICY "Users can insert logs" ON treatment_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_treatment_logs_treatment_id ON treatment_logs(treatment_id);
