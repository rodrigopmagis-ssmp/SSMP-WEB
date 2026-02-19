-- ============================================
-- Fix: Tabela de Rastreamento de Follow-up
-- Descrição: Cria a tabela se não existir e aplica políticas de segurança
-- ============================================

-- 0. Função de Trigger para updated_at (se não existir, cria ou substitui)
CREATE OR REPLACE FUNCTION update_followup_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Criação da Tabela (se não existir)
CREATE TABLE IF NOT EXISTS followup_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL,
  message_sent_at TEXT,
  message_responded_at TEXT,
  has_responded BOOLEAN,
  response_content TEXT,
  checklist JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(negocio_id, stage_id)
);

-- 1.1 Adicionar coluna checklist caso a tabela já exista (para quem já rodou o script anterior)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'followup_tracking' AND column_name = 'checklist') THEN
        -- Coluna já existe
    ELSE
        ALTER TABLE followup_tracking ADD COLUMN checklist JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Habilitar RLS
ALTER TABLE followup_tracking ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (RLS)

-- Remover políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Usuários autenticados podem ver tracking" ON followup_tracking;
DROP POLICY IF EXISTS "Usuários autenticados podem criar tracking" ON followup_tracking;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar tracking" ON followup_tracking;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar tracking" ON followup_tracking;

-- SELECT
CREATE POLICY "Usuários autenticados podem ver tracking"
ON followup_tracking FOR SELECT
TO authenticated
USING (true);

-- INSERT
CREATE POLICY "Usuários autenticados podem criar tracking"
ON followup_tracking FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE
CREATE POLICY "Usuários autenticados podem atualizar tracking"
ON followup_tracking FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE
CREATE POLICY "Usuários autenticados podem deletar tracking"
ON followup_tracking FOR DELETE
TO authenticated
USING (true);

-- 4. Trigger de Atualização (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_followup_tracking_updated_at') THEN
        CREATE TRIGGER trigger_update_followup_tracking_updated_at
        BEFORE UPDATE ON followup_tracking
        FOR EACH ROW
        EXECUTE FUNCTION update_followup_tracking_updated_at();
    END IF;
END $$;
