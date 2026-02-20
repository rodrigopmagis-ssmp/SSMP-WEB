-- PARTE 1: TABELA E REGRAS DE SEGURANÇA (RLS)
-- Execute este bloco primeiro

-- Habilitar extensão de UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criação da Tabela
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinics(id),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('comprovante_pagamento', 'foto_paciente', 'boleto')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Limpar Políticas Antigas
DROP POLICY IF EXISTS "Users can view attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can insert attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can delete attachments" ON public.task_attachments;

-- Nova Política de Visualização
CREATE POLICY "Users can view attachments" ON public.task_attachments
    FOR SELECT USING (
        clinic_id IN (SELECT p.clinic_id FROM public.profiles p WHERE p.id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'master')
    );

-- Nova Política de Inserção
CREATE POLICY "Users can insert attachments" ON public.task_attachments
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        (
            clinic_id IN (SELECT p.clinic_id FROM public.profiles p WHERE p.id = auth.uid()) OR
            EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'master')
        )
    );

-- Nova Política de Deleção
CREATE POLICY "Users can delete attachments" ON public.task_attachments
    FOR DELETE USING (
        auth.uid() = created_by OR 
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND (
                p.role IN ('master', 'admin', 'super_admin') 
                AND (p.clinic_id = task_attachments.clinic_id OR p.role = 'master')
            )
        )
    );

--------------------------------------------------------------------------------

-- PARTE 2: CONFIGURAÇÃO DE ARMAZENAMENTO (STORAGE)
-- Execute este bloco depois da Parte 1

-- Garantir que o bucket exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Limpar Políticas de Storage
DROP POLICY IF EXISTS "Storage Insert Policy" ON storage.objects;
DROP POLICY IF EXISTS "Storage Select Policy" ON storage.objects;
DROP POLICY IF EXISTS "Storage Delete Policy" ON storage.objects;

-- Criar Políticas de Storage
CREATE POLICY "Storage Insert Policy" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'task-attachments' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Storage Select Policy" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'task-attachments' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Storage Delete Policy" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'task-attachments' AND 
        auth.role() = 'authenticated'
    );
