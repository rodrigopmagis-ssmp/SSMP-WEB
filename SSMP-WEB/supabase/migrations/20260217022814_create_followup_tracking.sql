-- Criar tabela para rastrear interações de acompanhamento
CREATE TABLE IF NOT EXISTS followup_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL,
  message_sent_at TEXT,
  message_responded_at TEXT,
  has_responded BOOLEAN,
  response_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(negocio_id, stage_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_followup_tracking_negocio ON followup_tracking(negocio_id);
CREATE INDEX IF NOT EXISTS idx_followup_tracking_stage ON followup_tracking(stage_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_followup_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_followup_tracking_updated_at
  BEFORE UPDATE ON followup_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_followup_tracking_updated_at();

-- Comentários para documentação
COMMENT ON TABLE followup_tracking IS 'Rastreia interações de acompanhamento (envio de mensagem e respostas) para cada estágio de follow-up de um negócio';
COMMENT ON COLUMN followup_tracking.negocio_id IS 'ID do negócio relacionado';
COMMENT ON COLUMN followup_tracking.stage_id IS 'ID do estágio de acompanhamento (da configuração da campanha)';
COMMENT ON COLUMN followup_tracking.message_sent_at IS 'Data/hora formatada do envio da mensagem';
COMMENT ON COLUMN followup_tracking.message_responded_at IS 'Data/hora formatada da resposta do paciente';
COMMENT ON COLUMN followup_tracking.has_responded IS 'Se o paciente respondeu (true) ou não (false)';
COMMENT ON COLUMN followup_tracking.response_content IS 'Conteúdo da resposta ou "Não respondeu"';
