-- Remove RLS restrictions from procedures table
-- Execute este SQL no Supabase SQL Editor
-- https://supabase.com/dashboard/project/tofbruviyllvdmcllgjx/sql

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own procedures" ON procedures;
DROP POLICY IF EXISTS "Users can insert their own procedures" ON procedures;
DROP POLICY IF EXISTS "Users can update their own procedures" ON procedures;
DROP POLICY IF EXISTS "Users can delete their own procedures" ON procedures;

-- Create new permissive policies for all authenticated users
CREATE POLICY "Authenticated users can view all procedures"
  ON procedures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert procedures"
  ON procedures FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all procedures"
  ON procedures FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete all procedures"
  ON procedures FOR DELETE
  TO authenticated
  USING (true);

-- Add unique constraint to prevent duplicate procedures
ALTER TABLE procedures DROP CONSTRAINT IF EXISTS procedures_user_id_name_unique;
ALTER TABLE procedures 
ADD CONSTRAINT procedures_user_id_name_unique 
UNIQUE (user_id, name);
