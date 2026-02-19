-- Create google_integrations table
CREATE TABLE IF NOT EXISTS public.google_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  scope TEXT DEFAULT 'https://www.googleapis.com/auth/calendar',
  calendar_id TEXT DEFAULT 'primary',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_integration UNIQUE (user_id)
);

-- Enable RLS for google_integrations
ALTER TABLE public.google_integrations ENABLE ROW LEVEL SECURITY;

-- Policies for google_integrations
CREATE POLICY "Users can view own integration" 
ON public.google_integrations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own integration" 
ON public.google_integrations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integration" 
ON public.google_integrations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own integration" 
ON public.google_integrations FOR DELETE 
USING (auth.uid() = user_id);


-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Assuming profiles table exists and stores professionals
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  google_event_id TEXT,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('synced', 'error', 'pending')),
  type TEXT, -- Tipo de atendimento
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Enable RLS for appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Policies for appointments (Start tailored, expand as needed)
CREATE POLICY "Enable read access for authenticated users" 
ON public.appointments FOR SELECT 
TO authenticated 
USING (true); -- Allow all authenticated users to view appointments for now

CREATE POLICY "Enable insert for authenticated users" 
ON public.appointments FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
ON public.appointments FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Enable delete for authenticated users" 
ON public.appointments FOR DELETE 
TO authenticated 
USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_google_integrations_updated_at
    BEFORE UPDATE ON public.google_integrations
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
