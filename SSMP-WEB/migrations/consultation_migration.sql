-- ==========================================
-- MIGRAÇÃO: OTIMIZAÇÃO CONSULTAS IA
-- ==========================================

-- 1. Corrigir o erro de digitação no nome da clínica
-- Ajusta de 'Isabella' para 'Isabela'
UPDATE clinics 
SET fantasy_name = 'Dra. Isabela Rossetti' 
WHERE fantasy_name ILIKE '%Isabella Rossetti%';

-- 2. Adicionar clinic_id à tabela consultations
-- Permite o compartilhamento de dados entre membros da mesma clínica
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultations' AND column_name = 'clinic_id') THEN
        ALTER TABLE consultations ADD COLUMN clinic_id UUID REFERENCES clinics(id);
    END IF;
END $$;

-- 3. Backfill do clinic_id
-- Associa consultas existentes às clínicas de seus respectivos médicos
UPDATE consultations c
SET clinic_id = p.clinic_id
FROM profiles p
WHERE c.doctor_id = p.id
AND c.clinic_id IS NULL;

-- 4. Atualizar Políticas de RLS (Row Level Security)
-- Permite que usuários (master, admin, doctor) vejam consultas de sua própria clínica

DROP POLICY IF EXISTS "Users can view consultations of their clinic" ON consultations;
CREATE POLICY "Users can view consultations of their clinic" ON consultations
FOR SELECT
USING (
    clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert consultations for their clinic" ON consultations;
CREATE POLICY "Users can insert consultations for their clinic" ON consultations
FOR INSERT
WITH CHECK (
    clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update consultations of their clinic" ON consultations;
CREATE POLICY "Users can update consultations of their clinic" ON consultations
FOR UPDATE
USING (
    clinic_id IN (
        SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
);

-- 5. Regularizar a usuária amandadossantos1403@gmail.com
-- Garante que ela esteja aprovada e vinculada à clínica correta
UPDATE profiles
SET status = 'approved',
    role = 'doctor',
    clinic_id = (SELECT id FROM clinics WHERE fantasy_name = 'Dra. Isabela Rossetti' LIMIT 1)
WHERE email = 'amandadossantos1403@gmail.com';
