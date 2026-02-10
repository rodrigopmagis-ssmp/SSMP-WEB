-- ============================================
-- Migração: Módulo de Tarefas & Lembretes
-- ============================================

-- Tabela principal de Tarefas
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('one_time', 'recurring')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    due_at TIMESTAMPTZ,
    reminder_minutes INT, -- Minutos antes do vencimento para alertar (ex: 15, 30, 60)
    recurrence_rule JSONB, -- Ex: { "frequency": "daily", "interval": 1, "end_date": "..." }
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id)
);

-- Tabela de Atribuições (Quem é responsável pela tarefa)
CREATE TABLE IF NOT EXISTS public.task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, user_id) -- Evitar duplicidade de atribuição
);

-- Tabela de Comentários/Histórico (Opcional para MVP, mas bom ter)
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para Performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);

-- RLS (Row Level Security)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Policies (Simplificadas para MVP - autenticados podem ver/criar)
-- Em produção idealmente restringiríamos quem vê o que, mas para clínica pequena geralmente todos veem tudo ou apenas os envolvidos.
-- Vamos permitir leitura global para facilitar "visão geral" do gestor, mas edição pode ser refinada depois.

CREATE POLICY "Allow read access for authenticated users" ON public.tasks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert access for authenticated users" ON public.tasks
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update access for authenticated users" ON public.tasks
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow delete access for authenticated users" ON public.tasks
    FOR DELETE TO authenticated USING (true);

-- Mesmas policies para assignments
CREATE POLICY "Allow read access for authenticated users" ON public.task_assignments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert access for authenticated users" ON public.task_assignments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow delete access for authenticated users" ON public.task_assignments
    FOR DELETE TO authenticated USING (true);

-- Comments
CREATE POLICY "Allow all access for authenticated users" ON public.task_comments
    FOR ALL TO authenticated USING (true);


-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
