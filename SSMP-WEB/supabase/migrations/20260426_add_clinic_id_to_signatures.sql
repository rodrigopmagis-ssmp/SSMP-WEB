-- Add clinic_id column to signatures table if it doesn't exist
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_signatures_clinic_id ON public.signatures(clinic_id);

-- 1. Policies for 'signatures' table
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view signatures of their clinic" ON public.signatures;
DROP POLICY IF EXISTS "Users can see their clinic's signatures" ON public.signatures;
CREATE POLICY "Users can view signatures of their clinic"
ON public.signatures
FOR SELECT
TO authenticated
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Anyone can insert signatures (via public link)" ON public.signatures;
CREATE POLICY "Anyone can insert signatures (via public link)"
ON public.signatures
FOR INSERT
TO public, anon
WITH CHECK (true);

-- 2. Policies for 'patient_documents' table
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can update document to signed" ON public.patient_documents;
CREATE POLICY "Public can update document to signed"
ON public.patient_documents
FOR UPDATE
TO public, anon
USING (status = 'pending' OR status = 'draft')
WITH CHECK (status = 'signed');

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';

