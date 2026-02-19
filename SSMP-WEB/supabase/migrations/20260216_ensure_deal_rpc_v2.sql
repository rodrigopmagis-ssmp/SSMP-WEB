-- Create a secure function to ensure a deal exists for a lead
-- V2: Auto-assigns stage_id based on campaign configuration

CREATE OR REPLACE FUNCTION public.ensure_deal_for_lead(
    p_lead_id UUID,
    p_clinic_id UUID,
    p_campaign_id UUID,
    p_lead_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deal_id UUID;
    v_deal JSONB;
    v_stage_id UUID;
BEGIN
    -- 1. Find the correct stage_id for this campaign (Default to 'lead_quiz' or position 1)
    SELECT id INTO v_stage_id 
    FROM public.campaign_stages 
    WHERE campaign_id = p_campaign_id 
    ORDER BY position ASC 
    LIMIT 1;

    -- Check if deal exists
    SELECT id INTO v_deal_id
    FROM public.negocios
    WHERE id_lead = p_lead_id
    LIMIT 1;

    IF v_deal_id IS NOT NULL THEN
        -- Update existing deal
        UPDATE public.negocios
        SET 
            campaign_id = p_campaign_id,
            -- Update stage_id only if it's null, otherwise keep current progress
            stage_id = COALESCE(stage_id, v_stage_id) 
        WHERE id = v_deal_id
        RETURNING to_jsonb(negocios.*) INTO v_deal;
    ELSE
        -- Create new deal
        INSERT INTO public.negocios (
            id_lead,
            id_clinica,
            campaign_id,
            stage_id, -- NEW: Assign the looked-up stage ID
            estagio,
            nome,
            valor_consulta,
            tentativas_contato,
            status_pagamento,
            pre_vendas_iniciado,
            alerta_sla_enviado,
            perda_automatica_aplicada,
            agendamento_confirmado,
            criado_em,
            atualizado_em
        ) VALUES (
            p_lead_id,
            p_clinic_id,
            p_campaign_id,
            v_stage_id, -- Correctly linked to stage
            'lead_quiz', -- Legacy string fallback
            p_lead_name,
            0,
            0,
            'pendente',
            false,
            false,
            false,
            false,
            now(),
            now()
        )
        RETURNING to_jsonb(negocios.*) INTO v_deal;
    END IF;

    RETURN v_deal;
END;
$$;
