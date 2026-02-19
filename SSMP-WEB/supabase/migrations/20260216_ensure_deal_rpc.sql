-- Create a secure function to ensure a deal exists for a lead
-- This function runs with SECURITY DEFINER privileges to allow anonymous leads to create deals

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
BEGIN
    -- Check if deal exists
    SELECT id INTO v_deal_id
    FROM public.negocios
    WHERE id_lead = p_lead_id
    LIMIT 1;

    IF v_deal_id IS NOT NULL THEN
        -- Update existing deal
        UPDATE public.negocios
        SET campaign_id = p_campaign_id
        WHERE id = v_deal_id
        RETURNING to_jsonb(negocios.*) INTO v_deal;
    ELSE
        -- Create new deal
        INSERT INTO public.negocios (
            id_lead,
            id_clinica,
            campaign_id,
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
            'lead_quiz', -- Default stage key
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
