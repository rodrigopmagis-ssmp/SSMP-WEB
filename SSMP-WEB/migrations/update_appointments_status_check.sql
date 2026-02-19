-- Drop existing check constraint if it exists (name might vary, Supabase usually names it table_column_check)
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Add updated check constraint with all application-supported statuses
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'));

-- Ensure index exists on status column
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
