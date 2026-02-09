-- ============================================
-- Módulo: Pipeline de Vendas (Negócios)
-- Descrição: Criação das tabelas para gestão do pipeline comercial
-- Campos em Português BR
-- Data: 2026-01-29
-- ============================================

-- Tabela principal de negócios
CREATE TABLE IF NOT EXISTS negocios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_lead UUID REFERENCES leads(id) ON DELETE CASCADE,
  id_paciente UUID REFERENCES patients(id) ON DELETE SET NULL,
  id_clinica UUID REFERENCES clinics(id),
  
  -- Etapa do Pipeline
  estagio VARCHAR(50) NOT NULL DEFAULT 'lead_quiz',
  -- Opções: 'lead_quiz', 'em_atendimento', 'qualificado', 
  --         'oferta_consulta', 'consulta_aceita', 'consulta_paga', 
  --         'ganho', 'consulta_realizada', 'perdido'
  
  subestagio VARCHAR(50),
  -- Exemplos de subestagio:
  -- em_atendimento: 'tentativa_1', 'tentativa_2', 'tentativa_3+'
  -- oferta_consulta: 'ofertada', 'objecao_preco', 'pensando'
  -- consulta_aceita: 'link_enviado', 'aguardando_pagamento'
  
  -- Responsabilidade
  id_vendedor UUID REFERENCES profiles(id),
  
  -- Valor do Negócio
  valor_consulta DECIMAL(10,2) DEFAULT 250.00,
  
  -- Rastreamento de Contato
  tentativas_contato INTEGER DEFAULT 0,
  ultimo_contato_em TIMESTAMP,
  
  -- Rastreamento de Perda
  motivo_perda VARCHAR(100),
  -- Opções: 'bloqueou', 'sem_interesse', 'nao_respondeu', 
  --         'objecao_preco', 'objecao_tempo', 'concorrente', 'nao_pode_pagar'
  detalhes_perda TEXT,
  perdido_em TIMESTAMP,
  
  -- Agendamento
  data_agendamento TIMESTAMP,
  agendamento_confirmado BOOLEAN DEFAULT FALSE,
  
  -- Pagamento
  status_pagamento VARCHAR(50) DEFAULT 'pendente',
  -- Opções: 'pendente', 'processando', 'pago', 'falhou', 'reembolsado'
  id_pagamento VARCHAR(255),
  gateway_pagamento VARCHAR(50),
  pago_em TIMESTAMP,
  
  -- Flags de Automação
  pre_vendas_iniciado BOOLEAN DEFAULT FALSE,
  pre_vendas_mensagem_em TIMESTAMP,
  alerta_sla_enviado BOOLEAN DEFAULT FALSE,
  perda_automatica_aplicada BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW(),
  entrou_pipeline_em TIMESTAMP,
  
  -- Metadados
  metadados JSONB,
  
  -- Constraints
  CONSTRAINT estagio_valido CHECK (
    estagio IN ('lead_quiz', 'em_atendimento', 'qualificado', 
                'oferta_consulta', 'consulta_aceita', 'consulta_paga', 
                'ganho', 'consulta_realizada', 'perdido')
  ),
  CONSTRAINT status_pagamento_valido CHECK (
    status_pagamento IN ('pendente', 'processando', 'pago', 'falhou', 'reembolsado')
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_negocios_estagio ON negocios(estagio);
CREATE INDEX IF NOT EXISTS idx_negocios_vendedor ON negocios(id_vendedor);
CREATE INDEX IF NOT EXISTS idx_negocios_lead ON negocios(id_lead);
CREATE INDEX IF NOT EXISTS idx_negocios_clinica ON negocios(id_clinica);
CREATE INDEX IF NOT EXISTS idx_negocios_criado_em ON negocios(criado_em DESC);

-- Tabela de atividades do negócio
CREATE TABLE IF NOT EXISTS atividades_negocios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_negocio UUID REFERENCES negocios(id) ON DELETE CASCADE,
  id_usuario UUID REFERENCES profiles(id),
  
  tipo_atividade VARCHAR(50) NOT NULL,
  -- Opções: 'mudanca_estagio', 'tentativa_contato', 'nota', 
  --         'atualizacao_pagamento', 'agendado', 'perdido', 'reativado'
  
  descricao TEXT NOT NULL,
  metadados JSONB,
  
  criado_em TIMESTAMP DEFAULT NOW(),
  
  -- Constraint
  CONSTRAINT tipo_atividade_valido CHECK (
    tipo_atividade IN ('mudanca_estagio', 'tentativa_contato', 'nota', 
                       'atualizacao_pagamento', 'agendado', 'perdido', 'reativado')
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_atividades_negocios_negocio ON atividades_negocios(id_negocio);
CREATE INDEX IF NOT EXISTS idx_atividades_negocios_tipo ON atividades_negocios(tipo_atividade);
CREATE INDEX IF NOT EXISTS idx_atividades_negocios_criado ON atividades_negocios(criado_em DESC);

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION atualizar_negocios_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_negocios_atualizado_em
  BEFORE UPDATE ON negocios
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_negocios_atualizado_em();

-- Comentários para documentação
COMMENT ON TABLE negocios IS 'Pipeline de vendas - Negócios comerciais';
COMMENT ON TABLE atividades_negocios IS 'Log de atividades dos negócios';

COMMENT ON COLUMN negocios.estagio IS 'Etapa atual do negócio no pipeline';
COMMENT ON COLUMN negocios.subestagio IS 'Substatus dentro da etapa (ex: tentativa_1, tentativa_2)';
COMMENT ON COLUMN negocios.id_vendedor IS 'Vendedor responsável pelo negócio';
COMMENT ON COLUMN negocios.valor_consulta IS 'Valor da consulta (padrão R$ 250)';
COMMENT ON COLUMN negocios.tentativas_contato IS 'Número de tentativas de contato realizadas';
COMMENT ON COLUMN negocios.motivo_perda IS 'Motivo estruturado da perda';
COMMENT ON COLUMN negocios.pre_vendas_iniciado IS 'Flag indicando se pré-vendas foi iniciado';
COMMENT ON COLUMN negocios.alerta_sla_enviado IS 'Flag indicando se alerta de SLA foi enviado';
COMMENT ON COLUMN negocios.perda_automatica_aplicada IS 'Flag indicando se perda automática foi aplicada';
