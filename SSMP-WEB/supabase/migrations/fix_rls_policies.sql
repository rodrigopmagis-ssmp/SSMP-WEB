-- FIX: Drop old RLS policies and recreate with auth.jwt()
-- This fixes the "permission denied for table users" error

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view categories from their clinic or defaults" ON task_categories;
DROP POLICY IF EXISTS "Admins can create categories" ON task_categories;
DROP POLICY IF EXISTS "Admins can update categories" ON task_categories;

-- Recreate policies with auth.jwt() instead of SELECT from auth.users
CREATE POLICY "Users can view categories from their clinic or defaults"
    ON task_categories FOR SELECT
    USING (
        is_active = true 
        AND (
            is_default = true 
            OR clinic_id = (auth.jwt()->>'clinic_id')::uuid
        )
    );

CREATE POLICY "Admins can create categories"
    ON task_categories FOR INSERT
    WITH CHECK (
        (auth.jwt()->>'role') IN ('admin', 'super_admin')
    );

CREATE POLICY "Admins can update categories"
    ON task_categories FOR UPDATE
    USING (
        (auth.jwt()->>'role') IN ('admin', 'super_admin')
    );
