-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create campaign_stages table
CREATE TABLE IF NOT EXISTS public.campaign_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    color TEXT,
    is_system_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add updated_at trigger for campaigns if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_campaign_stages_updated_at
    BEFORE UPDATE ON public.campaign_stages
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Add campaign_id and stage_id to negocios table
ALTER TABLE public.negocios 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.campaign_stages(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_stages ENABLE ROW LEVEL SECURITY;

-- Policies for campaigns
CREATE POLICY "Users can view campaigns from their clinic" ON public.campaigns
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert campaigns" ON public.campaigns
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'master')
        )
    );

CREATE POLICY "Admins can update campaigns" ON public.campaigns
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'master')
        )
    );

CREATE POLICY "Admins can delete campaigns" ON public.campaigns
    FOR DELETE USING (
        clinic_id IN (
            SELECT clinic_id FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'master')
        )
    );

-- Policies for campaign_stages
CREATE POLICY "Users can view stages from their clinic campaigns" ON public.campaign_stages
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM public.campaigns 
            WHERE clinic_id IN (
                SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins can manage stages" ON public.campaign_stages
    FOR ALL USING (
        campaign_id IN (
            SELECT id FROM public.campaigns 
            WHERE clinic_id IN (
                SELECT clinic_id FROM public.profiles 
                WHERE id = auth.uid() AND (role = 'admin' OR role = 'master')
            )
        )
    );

-- MIGRATION LOGIC: Create Default Campaign and Migrate Existing Deals
DO $$
DECLARE
    clinic_rec RECORD;
    default_campaign_id UUID;
    stage_rec RECORD;
    stage_map JSONB := '{}';
    estagio_key TEXT;
    new_stage_id UUID;
BEGIN
    -- For each clinic, create a default campaign if none exists
    FOR clinic_rec IN SELECT id FROM public.clinics LOOP
        
        -- Create default campaign
        INSERT INTO public.campaigns (clinic_id, name, description, is_active)
        VALUES (clinic_rec.id, 'Pipeline Padrão', 'Campanha migrada do sistema antigo', true)
        RETURNING id INTO default_campaign_id;

        -- Create standard stages for this campaign
        -- Map existing fixed stages to new dynamic stages
        
        -- 1. Lead Quiz
        INSERT INTO public.campaign_stages (campaign_id, title, position, color, is_system_default)
        VALUES (default_campaign_id, 'Lead Quiz', 1, '#3B82F6', false)
        RETURNING id INTO new_stage_id;
        stage_map := jsonb_set(stage_map, '{lead_quiz}', to_jsonb(new_stage_id));

        -- 2. Em Atendimento
        INSERT INTO public.campaign_stages (campaign_id, title, position, color, is_system_default)
        VALUES (default_campaign_id, 'Em Atendimento', 2, '#F59E0B', false)
        RETURNING id INTO new_stage_id;
        stage_map := jsonb_set(stage_map, '{em_atendimento}', to_jsonb(new_stage_id));

        -- 3. Qualificado
        INSERT INTO public.campaign_stages (campaign_id, title, position, color, is_system_default)
        VALUES (default_campaign_id, 'Qualificado', 3, '#F97316', false)
        RETURNING id INTO new_stage_id;
        stage_map := jsonb_set(stage_map, '{qualificado}', to_jsonb(new_stage_id));

        -- 4. Oferta de Consulta
        INSERT INTO public.campaign_stages (campaign_id, title, position, color, is_system_default)
        VALUES (default_campaign_id, 'Oferta de Consulta', 4, '#6366F1', false)
        RETURNING id INTO new_stage_id;
        stage_map := jsonb_set(stage_map, '{oferta_consulta}', to_jsonb(new_stage_id));

        -- 5. Consulta Aceita
        INSERT INTO public.campaign_stages (campaign_id, title, position, color, is_system_default)
        VALUES (default_campaign_id, 'Consulta Aceita', 5, '#10B981', false)
        RETURNING id INTO new_stage_id;
        stage_map := jsonb_set(stage_map, '{consulta_aceita}', to_jsonb(new_stage_id));

        -- 6. Consulta Paga
        INSERT INTO public.campaign_stages (campaign_id, title, position, color, is_system_default)
        VALUES (default_campaign_id, 'Consulta Paga', 6, '#8B5CF6', false)
        RETURNING id INTO new_stage_id;
        stage_map := jsonb_set(stage_map, '{consulta_paga}', to_jsonb(new_stage_id));

         -- 7. Consulta Realizada
        INSERT INTO public.campaign_stages (campaign_id, title, position, color, is_system_default)
        VALUES (default_campaign_id, 'Consulta Realizada', 7, '#84CC16', false)
        RETURNING id INTO new_stage_id;
        stage_map := jsonb_set(stage_map, '{consulta_realizada}', to_jsonb(new_stage_id));

        -- 8. Ganho
        INSERT INTO public.campaign_stages (campaign_id, title, position, color, is_system_default)
        VALUES (default_campaign_id, 'Ganho', 8, '#10B981', true)
        RETURNING id INTO new_stage_id;
        stage_map := jsonb_set(stage_map, '{ganho}', to_jsonb(new_stage_id));
        
        -- 9. Perdido (Create a stage for it, though usually it's a status)
        -- In this new model, Lost might be a status flag, but we'll add a stage ensuring visualization
        -- Or rely on metadata. Let's add a stage for visual parity.
        -- Actually, usually 'Perdido' is not a column but a state. 
        -- However, the previous Kanban had a 'Perdido' column? The code shows:
        -- { key: 'perdido', label: 'Perdido', icon: 'cancel', color: '#EF4444' } was NOT in the main list in SalesPipeline.tsx line 13-22!
        -- Wait, SalesPipeline.tsx lines 13-22 shows keys: lead_quiz, em_atendimento, qualificado, oferta_consulta, consulta_aceita, consulta_paga, consulta_realizada, ganho.
        -- 'perdido' was handled via filter dropdown in SalesSidebar.tsx line 118.
        -- So deals with 'perdido' stage likely won't be in a column by default. 
        -- We will update them to have campaign_id pointing to this default campaign, but stage_id might be null or we map to a 'Lost' stage if we want one.
        -- Let's NOT create a Lost stage for now to match current Kanban, but we MUST update the campaign_id.

        -- Update existing deals for this clinic
        FOR estagio_key IN SELECT jsonb_object_keys(stage_map) LOOP
             UPDATE public.negocios
             SET 
                campaign_id = default_campaign_id,
                stage_id = (stage_map->>estagio_key)::UUID
             WHERE 
                id_clinica = clinic_rec.id 
                AND estagio = estagio_key;
        END LOOP;

        -- Update 'perdido' deals to just have the campaign_id
        UPDATE public.negocios
        SET campaign_id = default_campaign_id
        WHERE id_clinica = clinic_rec.id AND estagio = 'perdido';

    END LOOP;
END $$;
