-- ============================================================
-- Seed: Leads de Demonstração para CRM Premium (V3 - Safe Edition)
-- Execute no Supabase Studio > SQL Editor
-- ============================================================
-- FIX: Removidas colunas "email", "origin", "kanban_status" e "score" (redundante).
-- Mantidas apenas colunas verificadas via negóciosService.ts.
-- ============================================================

DO $$
DECLARE
  v_clinic_id  UUID;
  v_vendedor   UUID;

  -- Lead IDs
  l_isabela    UUID := gen_random_uuid();
  l_camila     UUID := gen_random_uuid();
  l_leticia    UUID := gen_random_uuid();
  l_sofia      UUID := gen_random_uuid();
  l_marina     UUID := gen_random_uuid();
  l_fernanda   UUID := gen_random_uuid();
  l_priscila   UUID := gen_random_uuid();
  l_beatriz    UUID := gen_random_uuid();
  l_carolina   UUID := gen_random_uuid();
  l_amanda     UUID := gen_random_uuid();
  l_juliana    UUID := gen_random_uuid();
  l_thais      UUID := gen_random_uuid();

BEGIN
  -- Pegar clínica automaticamente
  SELECT id INTO v_clinic_id FROM clinics LIMIT 1;
  -- Pegar um vendedor
  SELECT id INTO v_vendedor FROM profiles LIMIT 1;

  -- ========================================================
  -- 1. INSERIR LEADS
  -- ========================================================
  INSERT INTO leads (id, clinic_id, name, whatsapp, 
    ai_urgency, ai_score, procedure_awareness, 
    timeline, commitment_level)
  VALUES
    -- Bloco: Captação – Novo Lead
    (l_isabela, v_clinic_id, 'Isabela Ferreira', '5511991110001', 
     'alta', 84, 'Rinoplastia', 'immediate', 'high'),

    (l_marina, v_clinic_id, 'Marina Duarte', '5511991110005', 
     'média', 72, 'Preenchimento Labial', '1_4_weeks', 'medium'),

    -- Bloco: Captação – Contato Automático Enviado
    (l_camila, v_clinic_id, 'Camila Rocha', '5511991110002', 
     'média', 61, 'Bichectomia', '1_4_weeks', 'medium'),

    -- Bloco: Captação – Aguardando Resposta
    (l_leticia, v_clinic_id, 'Letícia Vaz', '5511991110003', 
     'alta', 91, 'Lipo HD', 'immediate', 'high'),

    (l_fernanda, v_clinic_id, 'Fernanda Lima', '5511991110006', 
     'média', 55, 'Rinoplastia', '1_4_weeks', 'medium'),

    -- Bloco: Captação – Tentativa 2
    (l_sofia, v_clinic_id, 'Sofia Andrade', '5511991110004', 
     'baixa', 44, 'Botox', '1_3_months', 'low'),

    -- Bloco: Qualificação – Respondido
    (l_priscila, v_clinic_id, 'Priscila Nunes', '5511991110007', 
     'alta', 78, 'Abdominoplastia', 'immediate', 'high'),

    -- Bloco: Qualificação – Perfil Aprovado
    (l_beatriz, v_clinic_id, 'Beatriz Oliveira', '5511991110008', 
     'alta', 88, 'Mastopexia', 'immediate', 'high'),

    -- Bloco: Conversão – Avaliação Agendada
    (l_carolina, v_clinic_id, 'Carolina Mendes', '5511991110009', 
     'alta', 82, 'Rinoplastia', 'immediate', 'high'),

    -- Bloco: Conversão – Fechamento Realizado
    (l_amanda, v_clinic_id, 'Amanda Freitas', '5511991110010', 
     'alta', 95, 'Lipoaspiração', 'immediate', 'high'),

    -- Bloco: Pós-Venda
    (l_juliana, v_clinic_id, 'Juliana Costa', '5511991110011', 
     'baixa', 70, 'Botox', '1_4_weeks', 'medium'),

    -- Bloco: Perda
    (l_thais, v_clinic_id, 'Thaís Ramos', '5511991110012', 
     'baixa', 30, 'Preenchimento', '1_3_months', 'low')

  ON CONFLICT (id) DO NOTHING;

  -- ========================================================
  -- 2. INSERIR NEGÓCIOS
  -- ========================================================
  INSERT INTO negocios (id_lead, id_clinica, id_vendedor,
    estagio, bloco, coluna, valor_consulta,
    sla_primeiro_contato_limite, sla_estourou,
    metadados, criado_em, atualizado_em)
  VALUES
    -- ── Captação: Novo Lead ──
    (l_isabela, v_clinic_id, v_vendedor,
     'em_atendimento', 'captacao', 'novo_lead', 250,
     NOW() + INTERVAL '14 min', FALSE,
     '{"origem": "instagram"}'::jsonb,
     NOW() - INTERVAL '14 min', NOW()),

    (l_marina, v_clinic_id, v_vendedor,
     'em_atendimento', 'captacao', 'novo_lead', 250,
     NOW() + INTERVAL '16 min', FALSE,
     '{"origem": "google"}'::jsonb,
     NOW() - INTERVAL '16 min', NOW()),

    -- ── Captação: Contato Automático Enviado ──
    (l_camila, v_clinic_id, v_vendedor,
     'em_atendimento', 'captacao', 'contato_automatico_enviado', 250,
     NOW() + INTERVAL '4 min', FALSE,
     '{"origem": "indicacao"}'::jsonb,
     NOW() - INTERVAL '26 min', NOW()),

    -- ── Captação: Aguardando Resposta ──
    (l_leticia, v_clinic_id, v_vendedor,
     'em_atendimento', 'captacao', 'aguardando_resposta', 250,
     NOW() - INTERVAL '2 min', FALSE,
     '{"origem": "instagram"}'::jsonb,
     NOW() - INTERVAL '32 min', NOW()),

    (l_fernanda, v_clinic_id, v_vendedor,
     'em_atendimento', 'captacao', 'aguardando_resposta', 250,
     NOW() - INTERVAL '6 min', FALSE,
     '{"origem": "google"}'::jsonb,
     NOW() - INTERVAL '36 min', NOW()),

    -- ── Captação: Tentativa 2 ──
    (l_sofia, v_clinic_id, v_vendedor,
     'em_atendimento', 'captacao', 'tentativa_2', 250,
     NULL, FALSE,
     '{"origem": "meta"}'::jsonb,
     NOW() - INTERVAL '2 hours', NOW()),

    -- ── Qualificação: Respondido ──
    (l_priscila, v_clinic_id, v_vendedor,
     'qualificado', 'qualificacao', 'respondido', 450,
     NULL, FALSE,
     '{"origem": "instagram"}'::jsonb,
     NOW() - INTERVAL '3 hours', NOW()),

    -- ── Qualificação: Perfil Aprovado ──
    (l_beatriz, v_clinic_id, v_vendedor,
     'qualificado', 'qualificacao', 'perfil_aprovado', 680,
     NULL, FALSE,
     '{"origem": "indicacao"}'::jsonb,
     NOW() - INTERVAL '5 hours', NOW()),

    -- ── Conversão: Avaliação Agendada ──
    (l_carolina, v_clinic_id, v_vendedor,
     'consulta_aceita', 'conversao', 'avaliacao_agendada', 350,
     NULL, FALSE,
     '{"origem": "instagram"}'::jsonb,
     NOW() - INTERVAL '1 day', NOW()),

    -- ── Conversão: Fechamento Realizado ──
    (l_amanda, v_clinic_id, v_vendedor,
     'ganho', 'conversao', 'fechamento_realizado', 4800,
     NULL, FALSE,
     '{"origem": "indicacao"}'::jsonb,
     NOW() - INTERVAL '2 days', NOW()),

    -- ── Pós-Venda: Pós 48h ──
    (l_juliana, v_clinic_id, v_vendedor,
     'consulta_realizada', 'pos_venda', 'pos_48h', 0,
     NULL, FALSE,
     '{"origem": "google"}'::jsonb,
     NOW() - INTERVAL '3 days', NOW()),

    -- ── Perda: Não Respondeu ──
    (l_thais, v_clinic_id, v_vendedor,
     'perdido', 'perda', 'nao_respondeu', 0,
     NULL, FALSE,
     '{"origem": "meta"}'::jsonb,
     NOW() - INTERVAL '7 days', NOW());

  RAISE NOTICE 'Seed concluído! % leads e negócios criados.', 12;
END;
$$;
