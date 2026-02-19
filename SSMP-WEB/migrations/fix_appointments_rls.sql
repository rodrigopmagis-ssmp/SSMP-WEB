
-- Garantir que a tabela appointments existe
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  google_event_id TEXT,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('synced', 'error', 'pending')),
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas para recriar corretas
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.appointments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.appointments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.appointments;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.appointments;

-- Recriar policies permissivas para usuários autenticados (ajuste conforme necessidade de negócio)
CREATE POLICY "Enable read access for authenticated users" 
ON public.appointments FOR SELECT 
TO authenticated 
USING (true);

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

-- Índices essenciais
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
