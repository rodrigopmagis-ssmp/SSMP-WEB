-- 1. Função auxiliar para Segurança (RLS)
CREATE OR REPLACE FUNCTION public.get_auth_clinic_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (SELECT clinic_id FROM public.profiles WHERE id = auth.uid());
END;
$function$;

-- 2. Tabela de Modelos de Documentos
CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinics(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Documentos dos Pacientes
CREATE TABLE IF NOT EXISTS public.patient_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinics(id),
    patient_id UUID REFERENCES public.patients(id), -- Corrigido para 'patients'
    template_id UUID REFERENCES public.document_templates(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, signed, cancelled
    sent_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    signature_data TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Habilitar Segurança (RLS)
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- 5. Criar Políticas de Acesso
DROP POLICY IF EXISTS "Users can manage their clinic's templates" ON document_templates;
CREATE POLICY "Users can manage their clinic's templates" ON document_templates
FOR ALL USING (clinic_id = get_auth_clinic_id());

DROP POLICY IF EXISTS "Users can manage their clinic's documents" ON patient_documents;
CREATE POLICY "Users can manage their clinic's documents" ON patient_documents
FOR ALL USING (clinic_id = get_auth_clinic_id());

DROP POLICY IF EXISTS "Public can view document for signing" ON patient_documents;
CREATE POLICY "Public can view document for signing" ON patient_documents
FOR SELECT USING (status = 'pending');
