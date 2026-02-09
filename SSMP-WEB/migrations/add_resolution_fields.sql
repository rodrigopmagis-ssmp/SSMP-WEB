-- ============================================
-- Migração: Adicionar Campos de Resolução
-- ============================================
-- Descrição: Adiciona campos para registrar o encerramento detalhado de reclamações
-- com 9 status finais possíveis e motivo obrigatório.

-- Adicionar colunas de resolução
ALTER TABLE ombudsman_complaints
ADD COLUMN IF NOT EXISTS resolution_status TEXT,
ADD COLUMN IF NOT EXISTS resolution_reason TEXT,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);

-- Adicionar constraint para validar status de resolução
ALTER TABLE ombudsman_complaints
ADD CONSTRAINT check_resolution_status 
CHECK (resolution_status IN (
    'resolvida',
    'resolvida_acompanhamento',
    'nao_procedente',
    'parcialmente_resolvida',
    'nao_resolvida',
    'encerrada_inatividade',
    'cancelada_duplicada',
    'encerrada_acordo',
    'encerrada_juridico'
) OR resolution_status IS NULL);

-- Adicionar índice para consultas por status de resolução
CREATE INDEX IF NOT EXISTS idx_complaints_resolution_status 
ON ombudsman_complaints(resolution_status);

-- Adicionar índice para consultas por data de resolução
CREATE INDEX IF NOT EXISTS idx_complaints_resolved_at 
ON ombudsman_complaints(resolved_at);

-- Comentários para documentação
COMMENT ON COLUMN ombudsman_complaints.resolution_status IS 'Status final da resolução da reclamação (9 opções possíveis)';
COMMENT ON COLUMN ombudsman_complaints.resolution_reason IS 'Motivo detalhado do encerramento (obrigatório ao encerrar)';
COMMENT ON COLUMN ombudsman_complaints.resolved_at IS 'Data e hora do encerramento da reclamação';
COMMENT ON COLUMN ombudsman_complaints.resolved_by IS 'ID do usuário que encerrou a reclamação';

-- Atualizar reclamações já resolvidas (migração de dados)
UPDATE ombudsman_complaints
SET resolution_status = 'resolvida'
WHERE status = 'resolvida' AND resolution_status IS NULL;

-- ============================================
-- Descrição dos Status de Resolução
-- ============================================
/*
1. resolvida - Problema solucionado conforme protocolo
2. resolvida_acompanhamento - Caso tecnicamente resolvido com follow-up
3. nao_procedente - Não foi identificada falha técnica
4. parcialmente_resolvida - Parte do problema foi solucionada
5. nao_resolvida - Não foi possível atender a demanda
6. encerrada_inatividade - Não houve continuidade interna
7. cancelada_duplicada - Registro indevido ou duplicado
8. encerrada_acordo - Houve acordo financeiro/comercial
9. encerrada_juridico - Caso transferido para jurídico
*/
