
-- Enable read access to profiles for all authenticated users
-- This is required for the Tasks module to allow assigning tasks to other team members

-- Drop existing policy if exists to avoid conflict (or create new one)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create policy
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
