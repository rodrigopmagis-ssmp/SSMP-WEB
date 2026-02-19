-- Add procedure_id column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_procedure_id ON public.appointments(procedure_id);
