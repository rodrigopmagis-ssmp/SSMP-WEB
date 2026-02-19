-- Migration to add 'rescheduled' status to appointments table

DO $$ 
BEGIN
    ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
    ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled'));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error altering constraint: %', SQLERRM;
END $$;
