-- Migration: Create task_categories table
-- Description: Stores task categories with colors, icons, and clinic association

-- Create task_categories table
CREATE TABLE IF NOT EXISTS task_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL, -- Hex color code (e.g., #FF5733)
    icon VARCHAR(50) NOT NULL, -- Material Symbols icon name
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- True for system default categories
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Add category_id to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL;

-- Create unique indexes for category names
-- For default categories (clinic_id IS NULL), name must be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_categories_default_name 
    ON task_categories(name) 
    WHERE clinic_id IS NULL;

-- For clinic-specific categories, name must be unique per clinic
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_categories_clinic_name 
    ON task_categories(name, clinic_id) 
    WHERE clinic_id IS NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_task_categories_clinic_id ON task_categories(clinic_id);
CREATE INDEX IF NOT EXISTS idx_task_categories_is_active ON task_categories(is_active);

-- Enable RLS
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_categories
-- Users can view active categories from their clinic or default categories
CREATE POLICY "Users can view categories from their clinic or defaults"
    ON task_categories FOR SELECT
    USING (
        is_active = true 
        AND (
            is_default = true 
            OR clinic_id = (auth.jwt()->>'clinic_id')::uuid
        )
    );

-- Only admins can insert categories
CREATE POLICY "Admins can create categories"
    ON task_categories FOR INSERT
    WITH CHECK (
        (auth.jwt()->>'role') IN ('admin', 'super_admin')
    );

-- Only admins can update categories
CREATE POLICY "Admins can update categories"
    ON task_categories FOR UPDATE
    USING (
        (auth.jwt()->>'role') IN ('admin', 'super_admin')
    );

-- Insert default categories (available to all clinics)
INSERT INTO task_categories (name, description, color, icon, is_default, is_active) 
SELECT * FROM (VALUES
    ('Atendimento ao Paciente', 'Tarefas relacionadas ao atendimento direto de pacientes', '#EC4899', 'person_check', true, true),
    ('Financeiro', 'Tarefas relacionadas a finanças, pagamentos e cobranças', '#10B981', 'payments', true, true),
    ('Administrativo', 'Tarefas administrativas e burocráticas', '#3B82F6', 'business_center', true, true),
    ('Operacional / Clínica', 'Tarefas operacionais da clínica e manutenção', '#F59E0B', 'local_hospital', true, true),
    ('Gestão / Direção', 'Tarefas estratégicas e de gestão', '#8B5CF6', 'corporate_fare', true, true)
) AS v(name, description, color, icon, is_default, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM task_categories 
    WHERE task_categories.name = v.name 
    AND task_categories.clinic_id IS NULL
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_task_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_categories_updated_at
    BEFORE UPDATE ON task_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_task_categories_updated_at();

-- Add comment
COMMENT ON TABLE task_categories IS 'Stores task categories with colors, icons, and clinic association';
COMMENT ON COLUMN task_categories.is_default IS 'System default categories available to all clinics';
COMMENT ON COLUMN task_categories.is_active IS 'Soft delete flag - categories cannot be deleted, only inactivated';
