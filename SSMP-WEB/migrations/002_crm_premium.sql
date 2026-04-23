-- ============================================================
-- Migration: 002_crm_premium.sql
-- Módulo: CRM Premium – Negócios, SLA, Mensagens, Agendamentos
-- Data: 2026-02-24
-- ============================================================

-- 1. Estender tabela negocios com colunas de SLA e follow-up
ALTER TABLE negocios
  ADD COLUMN IF NOT EXISTS bloco VARCHAR(30),
  ADD COLUMN IF NOT EXISTS coluna VARCHAR(50),
  ADD COLUMN IF NOT EXISTS valor_procedimento DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS sla_primeiro_contato_limite TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sla_estourou BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sla_respondido_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS followup_1_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS followup_2_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS followup_3_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS followup_4_sent_at TIMESTAMP;

-- População retroativa: mapear estagio antigo → bloco+coluna
UPDATE negocios SET
  bloco = CASE estagio
    WHEN 'lead_quiz'          THEN 'captacao'
    WHEN 'em_atendimento'     THEN 'captacao'
    WHEN 'qualificado'        THEN 'qualificacao'
    WHEN 'oferta_consulta'    THEN 'qualificacao'
    WHEN 'consulta_aceita'    THEN 'conversao'
    WHEN 'consulta_paga'      THEN 'conversao'
    WHEN 'ganho'              THEN 'conversao'
    WHEN 'consulta_realizada' THEN 'pos_venda'
    WHEN 'perdido'            THEN 'perda'
    ELSE 'captacao'
  END,
  coluna = CASE estagio
    WHEN 'lead_quiz'          THEN 'novo_lead'
    WHEN 'em_atendimento'     THEN 'aguardando_resposta'
    WHEN 'qualificado'        THEN 'perfil_aprovado'
    WHEN 'oferta_consulta'    THEN 'proposta_enviada'
    WHEN 'consulta_aceita'    THEN 'avaliacao_agendada'
    WHEN 'consulta_paga'      THEN 'avaliacao_confirmada'
    WHEN 'ganho'              THEN 'fechamento_realizado'
    WHEN 'consulta_realizada' THEN 'procedimento_executado'
    WHEN 'perdido'            THEN 'nao_respondeu'
    ELSE 'novo_lead'
  END
WHERE bloco IS NULL;

-- Índices para o novo modelo de kanban
CREATE INDEX IF NOT EXISTS idx_negocios_bloco        ON negocios(bloco);
CREATE INDEX IF NOT EXISTS idx_negocios_coluna       ON negocios(coluna);
CREATE INDEX IF NOT EXISTS idx_negocios_sla          ON negocios(sla_estourou, sla_primeiro_contato_limite)
  WHERE sla_estourou = FALSE AND sla_primeiro_contato_limite IS NOT NULL;

-- ============================================================
-- 2. Tabela: mensagens
-- ============================================================
CREATE TABLE IF NOT EXISTS mensagens (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id       UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  negocio_id    UUID REFERENCES negocios(id) ON DELETE SET NULL,
  direction     VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  canal         VARCHAR(20) DEFAULT 'whatsapp' CHECK (canal IN ('whatsapp', 'sms', 'email', 'internal')),
  conteudo      TEXT NOT NULL,

  -- Rastreamento de entrega
  sent_at       TIMESTAMP DEFAULT NOW(),
  delivered_at  TIMESTAMP,
  read_at       TIMESTAMP,

  -- Referências externas
  external_id   VARCHAR(255) UNIQUE,
  template_slug VARCHAR(100),
  metadados     JSONB,

  criado_em     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_lead        ON mensagens(lead_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_negocio     ON mensagens(negocio_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_direction   ON mensagens(direction);
-- Índice parcial hot-path: mensagens inbound não lidas (para SLA de resposta)
CREATE INDEX IF NOT EXISTS idx_mensagens_nao_lidas   ON mensagens(lead_id, sent_at)
  WHERE direction = 'inbound' AND read_at IS NULL;

COMMENT ON TABLE mensagens IS 'Log bidirecional de mensagens WhatsApp/SMS/Email por lead';

-- ============================================================
-- 3. Tabela: sla_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS sla_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  negocio_id      UUID REFERENCES negocios(id) ON DELETE SET NULL,

  tipo_sla        VARCHAR(50) NOT NULL CHECK (tipo_sla IN (
    'primeiro_contato', 'resposta_atendente',
    'followup_1', 'followup_2', 'followup_3', 'followup_4',
    'agendamento'
  )),

  iniciado_em     TIMESTAMP NOT NULL,
  limite_em       TIMESTAMP NOT NULL,
  resolvido_em    TIMESTAMP,
  tempo_decorrido INTEGER,   -- segundos até resolução
  estourou        BOOLEAN DEFAULT FALSE,

  metadados       JSONB,
  criado_em       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sla_logs_lead         ON sla_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_sla_logs_negocio      ON sla_logs(negocio_id);
CREATE INDEX IF NOT EXISTS idx_sla_logs_tipo         ON sla_logs(tipo_sla);
CREATE INDEX IF NOT EXISTS idx_sla_logs_estourou     ON sla_logs(estourou, limite_em)
  WHERE estourou = FALSE AND resolvido_em IS NULL;

COMMENT ON TABLE sla_logs IS 'Histórico de eventos de SLA por negócio';

-- ============================================================
-- 4. Tabela: agendamentos_crm
-- ============================================================
CREATE TABLE IF NOT EXISTS agendamentos_crm (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id             UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  negocio_id          UUID REFERENCES negocios(id) ON DELETE SET NULL,

  google_event_id     VARCHAR(255) UNIQUE,
  google_calendar_id  VARCHAR(255),

  data_hora           TIMESTAMP NOT NULL,
  duracao_minutos     INTEGER DEFAULT 60,
  procedimento        VARCHAR(255),
  vendedor_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,

  status              VARCHAR(30) DEFAULT 'agendado' CHECK (status IN (
    'agendado', 'confirmado', 'compareceu', 'no_show', 'cancelado', 'reagendado'
  )),

  reminder_24h_sent   BOOLEAN DEFAULT FALSE,
  reminder_24h_at     TIMESTAMP,
  reminder_2h_sent    BOOLEAN DEFAULT FALSE,
  reminder_2h_at      TIMESTAMP,

  notas               TEXT,
  criado_em           TIMESTAMP DEFAULT NOW(),
  atualizado_em       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_crm_lead     ON agendamentos_crm(lead_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_crm_data     ON agendamentos_crm(data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamentos_crm_status   ON agendamentos_crm(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_crm_google   ON agendamentos_crm(google_event_id);
-- Índice para cron de lembretes pendentes
CREATE INDEX IF NOT EXISTS idx_agendamentos_crm_lembretes ON agendamentos_crm(data_hora, reminder_24h_sent, reminder_2h_sent)
  WHERE status IN ('agendado', 'confirmado');

CREATE TRIGGER agendamentos_crm_updated_at
  BEFORE UPDATE ON agendamentos_crm
  FOR EACH ROW EXECUTE FUNCTION atualizar_negocios_atualizado_em();

COMMENT ON TABLE agendamentos_crm IS 'Agendamentos de avaliação com integração Google Calendar';

-- ============================================================
-- 5. Estender leads com score engine e fields de SLA
-- ============================================================
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS score               INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_detalhes      JSONB,
  ADD COLUMN IF NOT EXISTS is_vip              BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ticket_acumulado    DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_message_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS first_response_at   TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_leads_score   ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_vip     ON leads(is_vip) WHERE is_vip = TRUE;

-- ============================================================
-- 6. Função: verificar_sla_negocios (chamada via cron n8n)
-- ============================================================
CREATE OR REPLACE FUNCTION verificar_sla_negocios()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Marcar negócios com SLA de primeiro contato estourado
  UPDATE negocios
  SET sla_estourou = TRUE
  WHERE sla_estourou = FALSE
    AND sla_primeiro_contato_limite IS NOT NULL
    AND sla_primeiro_contato_limite < NOW()
    AND sla_respondido_em IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Actualizar sla_logs correspondentes
  UPDATE sla_logs
  SET
    estourou = TRUE,
    tempo_decorrido = EXTRACT(EPOCH FROM (NOW() - iniciado_em))::INTEGER
  WHERE resolvido_em IS NULL
    AND limite_em < NOW()
    AND estourou = FALSE;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. Função: recalcular_score_lead
-- ============================================================
CREATE OR REPLACE FUNCTION recalcular_score_lead(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_lead           leads%ROWTYPE;
  v_score          INTEGER := 0;
  v_tempo_resposta INTEGER;
  v_detalhes       JSONB := '{}';
BEGIN
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;

  -- 1. Velocidade de resposta (30 pts)
  IF v_lead.first_response_at IS NOT NULL AND v_lead.first_message_sent_at IS NOT NULL THEN
    v_tempo_resposta := EXTRACT(EPOCH FROM (v_lead.first_response_at - v_lead.first_message_sent_at))::INTEGER;
    v_score := v_score + CASE
      WHEN v_tempo_resposta <= 300  THEN 30
      WHEN v_tempo_resposta <= 900  THEN 20
      WHEN v_tempo_resposta <= 1800 THEN 10
      ELSE 0
    END;
    v_detalhes := v_detalhes || jsonb_build_object('velocidade_resposta_seg', v_tempo_resposta);
  END IF;

  -- 2. Urgência (20 pts) – via timeline do lead
  v_score := v_score + CASE v_lead.timeline
    WHEN 'immediate'  THEN 20
    WHEN '1_4_weeks'  THEN 15
    WHEN '1_3_months' THEN 8
    ELSE 0
  END;

  -- 3. Engajamento: commitment_level (15 pts)
  v_score := v_score + CASE v_lead.commitment_level
    WHEN 'high'   THEN 15
    WHEN 'medium' THEN 8
    WHEN 'low'    THEN 2
    ELSE 0
  END;

  -- 4. Score AI existente como base (20 pts máx)
  IF v_lead.ai_score IS NOT NULL THEN
    v_score := v_score + LEAST((v_lead.ai_score / 5)::INTEGER, 20);
  END IF;

  -- 5. VIP bonus (10 pts se ticket_acumulado > 3000)
  IF v_lead.ticket_acumulado > 3000 THEN
    v_score := v_score + 10;
  END IF;

  -- Teto em 100
  v_score := LEAST(v_score, 100);

  -- Persistir
  UPDATE leads
  SET
    score = v_score,
    score_detalhes = v_detalhes
  WHERE id = p_lead_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. View Materializada: metricas_pipeline_diarias
-- (Refresh via cron: REFRESH MATERIALIZED VIEW CONCURRENTLY)
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS metricas_pipeline_diarias AS
SELECT
  n.id_clinica,
  DATE(n.criado_em)                                                        AS data,
  n.bloco,
  COUNT(*)                                                                  AS total,
  COUNT(*) FILTER (WHERE n.sla_estourou = TRUE)                            AS sla_violacoes,
  ROUND(AVG(l.score), 1)                                                   AS score_medio,
  COUNT(*) FILTER (WHERE n.coluna IN ('fechamento_realizado','procedimento_executado')) AS fechados,
  SUM(n.valor_procedimento) FILTER (WHERE n.coluna IN ('fechamento_realizado','procedimento_executado')) AS receita
FROM negocios n
LEFT JOIN leads l ON l.id = n.id_lead
WHERE n.bloco IS NOT NULL
GROUP BY n.id_clinica, DATE(n.criado_em), n.bloco
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_metricas_pipeline_diarias_pk
  ON metricas_pipeline_diarias(id_clinica, data, bloco);

COMMENT ON MATERIALIZED VIEW metricas_pipeline_diarias IS
  'Snapshot diário de métricas do pipeline por clínica e bloco. Refresh via cron.';

-- ============================================================
-- 9. RLS Policies para as novas tabelas
-- ============================================================

-- mensagens: clinic users can see their own leads' messages
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY mensagens_clinic_access ON mensagens
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- sla_logs
ALTER TABLE sla_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sla_logs_clinic_access ON sla_logs
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- agendamentos_crm
ALTER TABLE agendamentos_crm ENABLE ROW LEVEL SECURITY;

CREATE POLICY agendamentos_crm_clinic_access ON agendamentos_crm
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
