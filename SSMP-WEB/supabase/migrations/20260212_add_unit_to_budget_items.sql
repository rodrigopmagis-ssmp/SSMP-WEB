-- Add 'unit' column to 'budget_items' table
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS unit text DEFAULT 'sessions';
