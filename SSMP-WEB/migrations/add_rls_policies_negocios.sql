-- ============================================
-- RLS Policies para Tabela Negocios
-- Descrição: Permitir acesso de usuários autenticados
-- ============================================

-- 1. Habilitar RLS (se não estiver)
ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades_negocios ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Usuários autenticados podem ver negócios" ON negocios;
DROP POLICY IF EXISTS "Usuários autenticados podem criar negócios" ON negocios;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar negócios" ON negocios;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar negócios" ON negocios;

DROP POLICY IF EXISTS "Usuários autenticados podem ver atividades" ON atividades_negocios;
DROP POLICY IF EXISTS "Usuários autenticados podem criar atividades" ON atividades_negocios;

-- ============================================
-- POLÍTICAS PARA NEGOCIOS
-- ============================================

-- SELECT: Qualquer usuário autenticado pode ver negócios
CREATE POLICY "Usuários autenticados podem ver negócios"
ON negocios
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Qualquer usuário autenticado pode criar negócios
CREATE POLICY "Usuários autenticados podem criar negócios"
ON negocios
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Qualquer usuário autenticado pode atualizar negócios
CREATE POLICY "Usuários autenticados podem atualizar negócios"
ON negocios
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE: Qualquer usuário autenticado pode deletar negócios
CREATE POLICY "Usuários autenticados podem deletar negócios"
ON negocios
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- POLÍTICAS PARA ATIVIDADES_NEGOCIOS
-- ============================================

-- SELECT: Qualquer usuário autenticado pode ver atividades
CREATE POLICY "Usuários autenticados podem ver atividades"
ON atividades_negocios
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Qualquer usuário autenticado pode criar atividades
CREATE POLICY "Usuários autenticados podem criar atividades"
ON atividades_negocios
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON POLICY "Usuários autenticados podem ver negócios" ON negocios 
IS 'Permite que usuários autenticados vejam todos os negócios';

COMMENT ON POLICY "Usuários autenticados podem criar negócios" ON negocios 
IS 'Permite que usuários autenticados criem novos negócios';

COMMENT ON POLICY "Usuários autenticados podem atualizar negócios" ON negocios 
IS 'Permite que usuários autenticados atualizem negócios';

COMMENT ON POLICY "Usuários autenticados podem deletar negócios" ON negocios 
IS 'Permite que usuários autenticados deletem negócios';
