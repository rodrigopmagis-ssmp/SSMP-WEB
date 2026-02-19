-- Migration: Fix Tasks RLS for Master Users (Version 2 - Checks Profiles Table)
-- Description: Ensures master users can view all tasks by checking public.profiles, escaping JWT limitations.

-- Enable RLS on tasks (idempotent)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

-- 1. SELECT Policy
CREATE POLICY "tasks_select_policy" ON tasks FOR SELECT
USING (
  -- 1. Master User Bypass (Check profiles table primarily)
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'master'
  ))
  OR
  -- Fallback to JWT/Metadata if profiles unused
  (auth.jwt() ->> 'role' = 'master') OR
  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'master')
  OR
  -- 2. Creator always sees their tasks
  (created_by = auth.uid())
  OR
  -- 3. Assignees can see tasks assigned to them
  (EXISTS (
    SELECT 1 FROM task_assignments 
    WHERE task_assignments.task_id = tasks.id 
    AND task_assignments.user_id = auth.uid()
  ))
  OR
  -- 4. Public tasks
  (visibility = 'public') 
  OR 
  -- 5. Restricted: Visible if in same clinic
  (visibility = 'restricted' AND clinic_id = (auth.jwt() ->> 'clinic_id')::uuid)
);

-- 2. INSERT Policy
CREATE POLICY "tasks_insert_policy" ON tasks FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
);

-- 3. UPDATE Policy
CREATE POLICY "tasks_update_policy" ON tasks FOR UPDATE
USING (
  -- Master
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'master'
  ))
  OR
  -- Creator
  (created_by = auth.uid())
  OR
  -- Assignees
  (EXISTS (
    SELECT 1 FROM task_assignments 
    WHERE task_assignments.task_id = tasks.id 
    AND task_assignments.user_id = auth.uid()
  ))
);

-- 4. DELETE Policy
CREATE POLICY "tasks_delete_policy" ON tasks FOR DELETE
USING (
  -- Master
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'master'
  ))
  OR
  -- Creator
  (created_by = auth.uid())
);
