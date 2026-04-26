-- Add clinic_id column to signatures table
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_signatures_clinic_id ON public.signatures(clinic_id);

-- Update RLS policies to use clinic_id
DROP POLICY IF EXISTS "Users can view signatures of their clinic" ON public.signatures;
CREATE POLICY "Users can view signatures of their clinic"
ON public.signatures
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
