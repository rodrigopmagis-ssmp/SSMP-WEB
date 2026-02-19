-- Execute este comando no Editor SQL do Supabase para corrigir o erro
ALTER TABLE followup_tracking 
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '{}'::jsonb;
