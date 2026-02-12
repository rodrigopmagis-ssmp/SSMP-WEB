
DO $$ 
BEGIN
    -- Add payment_methods column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'payment_methods') THEN
        ALTER TABLE budgets ADD COLUMN payment_methods jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;
