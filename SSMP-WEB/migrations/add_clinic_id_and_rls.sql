-- Migration: Add clinic_id and update RLS for multi-tenancy

-- 1. Add clinic_id to patients
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- 2. Add clinic_id to procedures
ALTER TABLE public.procedures 
ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- 3. Add clinic_id to patient_treatments (joining table)
ALTER TABLE public.patient_treatments 
ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE;

-- 4. Backfill clinic_id based on ownership
-- For patients: Get clinic_id from the profile of the user who owns the patient
UPDATE public.patients p
SET clinic_id = (
  SELECT pr.clinic_id 
  FROM public.profiles pr 
  WHERE pr.id = p.user_id
)
WHERE p.clinic_id IS NULL;

-- For procedures: Get clinic_id from the profile of the user who owns the procedure
UPDATE public.procedures pro
SET clinic_id = (
  SELECT pr.clinic_id 
  FROM public.profiles pr 
  WHERE pr.id = pro.user_id
)
WHERE pro.clinic_id IS NULL;

-- For patient_treatments: Inherit clinic_id from the patient
UPDATE public.patient_treatments pt
SET clinic_id = (
  SELECT p.clinic_id 
  FROM public.patients p 
  WHERE p.id = pt.patient_id
)
WHERE pt.clinic_id IS NULL;

-- 5. Enable RLS and Create Policies for Patients

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can insert their own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update their own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete their own patients" ON public.patients;

-- Create new clinic-based policies
CREATE POLICY "Users can view patients in their clinic"
ON public.patients FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert patients in their clinic"
ON public.patients FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update patients in their clinic"
ON public.patients FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete patients in their clinic"
ON public.patients FOR DELETE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 6. Enable RLS and Create Policies for Procedures

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own procedures" ON public.procedures;
DROP POLICY IF EXISTS "Users can insert their own procedures" ON public.procedures;
DROP POLICY IF EXISTS "Users can update their own procedures" ON public.procedures;
DROP POLICY IF EXISTS "Users can delete their own procedures" ON public.procedures;

-- Create new clinic-based policies
CREATE POLICY "Users can view procedures in their clinic"
ON public.procedures FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert procedures in their clinic"
ON public.procedures FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update procedures in their clinic"
ON public.procedures FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete procedures in their clinic"
ON public.procedures FOR DELETE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 7. Enable RLS and Create Policies for Patient Treatments
ALTER TABLE public.patient_treatments ENABLE ROW LEVEL SECURITY;

-- Drop maybe existing policies (if any)
DROP POLICY IF EXISTS "Users can view treatments in their clinic" ON public.patient_treatments;
DROP POLICY IF EXISTS "Users can insert treatments in their clinic" ON public.patient_treatments;
DROP POLICY IF EXISTS "Users can update treatments in their clinic" ON public.patient_treatments;
DROP POLICY IF EXISTS "Users can delete treatments in their clinic" ON public.patient_treatments;

CREATE POLICY "Users can view treatments in their clinic"
ON public.patient_treatments FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert treatments in their clinic"
ON public.patient_treatments FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update treatments in their clinic"
ON public.patient_treatments FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete treatments in their clinic"
ON public.patient_treatments FOR DELETE
USING (
  clinic_id IN (
    SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
  )
);
