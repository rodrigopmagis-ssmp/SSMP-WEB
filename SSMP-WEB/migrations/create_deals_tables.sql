-- ============================================
-- Módulo: Pipeline de Vendas (Negócios)
-- Descrição: Criação das tabelas para gestão do pipeline comercial
-- Autor: Sistema AestheticClinic OS
-- Data: 2026-01-29
-- ============================================

-- Tabela principal de negócios
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  clinic_id UUID REFERENCES clinics(id),
  
  -- Etapa do Pipeline
  stage VARCHAR(50) NOT NULL DEFAULT 'lead_quiz',
  -- Opções: 'lead_quiz', 'em_atendimento', 'qualificado', 
  --         'oferta_consulta', 'consulta_aceita', 'consulta_paga', 
  --         'ganho', 'consulta_realizada', 'perdido'
  
  substatus VARCHAR(50),
  -- Exemplos de substatus:
  -- em_atendimento: 'tentativa_1', 'tentativa_2', 'tentativa_3+'
  -- oferta_consulta: 'ofertada', 'objecao_preco', 'pensando'
  -- consulta_aceita: 'link_enviado', 'aguardando_pagamento'
  
  -- Responsabilidade
  seller_id UUID REFERENCES profiles(id),
  
  -- Valor do Negócio
  consultation_fee DECIMAL(10,2) DEFAULT 250.00,
  
  -- Rastreamento de Contato
  contact_attempts INTEGER DEFAULT 0,
  last_contact_at TIMESTAMP,
  
  -- Rastreamento de Perda
  loss_reason VARCHAR(100),
  -- Opções: 'bloqueou', 'sem_interesse', 'nao_respondeu', 
  --         'objecao_preco', 'objecao_tempo', 'concorrente', 'nao_pode_pagar'
  loss_details TEXT,
  lost_at TIMESTAMP,
  
  -- Agendamento
  scheduled_date TIMESTAMP,
  scheduled_confirmed BOOLEAN DEFAULT FALSE,
  
  -- Pagamento
  payment_status VARCHAR(50) DEFAULT 'pending',
  -- Opções: 'pending', 'processing', 'paid', 'failed', 'refunded'
  payment_id VARCHAR(255),
  payment_gateway VARCHAR(50),
  paid_at TIMESTAMP,
  
  -- Flags de Automação
  pre_sales_started BOOLEAN DEFAULT FALSE,
  pre_sales_message_sent_at TIMESTAMP,
  sla_alert_sent BOOLEAN DEFAULT FALSE,
  auto_lost_applied BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  entered_pipeline_at TIMESTAMP,
  
  -- Metadados
  metadata JSONB,
  
  -- Constraints
  CONSTRAINT valid_stage CHECK (
    stage IN ('lead_quiz', 'em_atendimento', 'qualificado', 
              'oferta_consulta', 'consulta_aceita', 'consulta_paga', 
              'ganho', 'consulta_realizada', 'perdido')
  ),
  CONSTRAINT valid_payment_status CHECK (
    payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded')
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_seller ON deals(seller_id);
CREATE INDEX IF NOT EXISTS idx_deals_lead ON deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_clinic ON deals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);

-- Tabela de atividades do negócio
CREATE TABLE IF NOT EXISTS deal_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  
  activity_type VARCHAR(50) NOT NULL,
  -- Opções: 'stage_change', 'contact_attempt', 'note', 
  --         'payment_update', 'scheduled', 'lost', 'reactivated'
  
  description TEXT NOT NULL,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraint
  CONSTRAINT valid_activity_type CHECK (
    activity_type IN ('stage_change', 'contact_attempt', 'note', 
                      'payment_update', 'scheduled', 'lost', 'reactivated')
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal ON deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_type ON deal_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_deal_activities_created ON deal_activities(created_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deals_updated_at();

-- Comentários para documentação
COMMENT ON TABLE deals IS 'Pipeline de vendas - Negócios comerciais';
COMMENT ON TABLE deal_activities IS 'Log de atividades dos negócios';

COMMENT ON COLUMN deals.stage IS 'Etapa atual do negócio no pipeline';
COMMENT ON COLUMN deals.substatus IS 'Substatus dentro da etapa (ex: tentativa_1, tentativa_2)';
COMMENT ON COLUMN deals.seller_id IS 'Vendedor responsável pelo negócio';
COMMENT ON COLUMN deals.consultation_fee IS 'Valor da consulta (padrão R$ 250)';
COMMENT ON COLUMN deals.contact_attempts IS 'Número de tentativas de contato realizadas';
COMMENT ON COLUMN deals.loss_reason IS 'Motivo estruturado da perda';
COMMENT ON COLUMN deals.pre_sales_started IS 'Flag indicando se pré-vendas foi iniciado';
COMMENT ON COLUMN deals.sla_alert_sent IS 'Flag indicando se alerta de SLA foi enviado';
COMMENT ON COLUMN deals.auto_lost_applied IS 'Flag indicando se perda automática foi aplicada';
