-- Add 'discount' column to 'budget_items' table
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0;

-- Note: Payment methods are stored in a JSONB column in the 'budgets' table.
-- No schema change is required for payment discounts, as the new field will be stored within the JSON object.
