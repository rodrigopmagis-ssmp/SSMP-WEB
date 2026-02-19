-- Adiciona colunas para controle de status da etapa
ALTER TABLE followup_tracking 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'skipped'
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS skipped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS skip_reason TEXT;
