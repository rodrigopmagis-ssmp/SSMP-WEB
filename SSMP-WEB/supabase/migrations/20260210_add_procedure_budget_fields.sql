
-- Add budget fields to procedures table

DO $$ 
BEGIN
    -- Add price column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'procedures' AND column_name = 'price') THEN
        ALTER TABLE procedures ADD COLUMN price numeric;
    END IF;

    -- Add promotional_price column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'procedures' AND column_name = 'promotional_price') THEN
        ALTER TABLE procedures ADD COLUMN promotional_price numeric;
    END IF;

    -- Add use_in_budget column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'procedures' AND column_name = 'use_in_budget') THEN
        ALTER TABLE procedures ADD COLUMN use_in_budget boolean DEFAULT false;
    END IF;

    -- Add budget_description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'procedures' AND column_name = 'budget_description') THEN
        ALTER TABLE procedures ADD COLUMN budget_description text;
    END IF;
END $$;
