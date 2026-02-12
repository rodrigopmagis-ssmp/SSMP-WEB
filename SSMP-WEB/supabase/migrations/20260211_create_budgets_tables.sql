-- Criação da tabela budgets
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    clinic_id UUID, -- Opcional, para compatibilidade futura ou atual se multi-tenant
    status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'approved', 'cancelled')) DEFAULT 'draft',
    payment_method TEXT CHECK (payment_method IN ('pix', 'credit_card', 'boleto', 'cash')),
    installments INTEGER,
    card_fee_percent NUMERIC,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    total_with_fee NUMERIC NOT NULL DEFAULT 0,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criação da tabela budget_items
CREATE TABLE IF NOT EXISTS public.budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL,
    procedure_name_snapshot TEXT NOT NULL,
    description_snapshot TEXT,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    sessions INTEGER NOT NULL DEFAULT 1,
    total_price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionar coluna allows_sessions na tabela procedures
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'procedures' AND column_name = 'allows_sessions') THEN
        ALTER TABLE public.procedures ADD COLUMN allows_sessions BOOLEAN DEFAULT false;
    END IF;
    
    -- Garantir que outras colunas necessárias existam (caso a migração 20260210... não tenha rodado ou completado)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'procedures' AND column_name = 'price') THEN
        ALTER TABLE public.procedures ADD COLUMN price NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'procedures' AND column_name = 'promotional_price') THEN
        ALTER TABLE public.procedures ADD COLUMN promotional_price NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'procedures' AND column_name = 'use_in_budget') THEN
        ALTER TABLE public.procedures ADD COLUMN use_in_budget BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'procedures' AND column_name = 'budget_description') THEN
        ALTER TABLE public.procedures ADD COLUMN budget_description TEXT;
    END IF;
END $$;

-- Habilitar RLS (Row Level Security) - Políticas básicas (ajustar conforme necessidade real de segurança)
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- Política de leitura (exemplo genérico: autenticado pode ler tudo por enquanto, ajustar para clinic_id se necessário)
CREATE POLICY "Enable read access for authenticated users" ON public.budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.budgets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.budgets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for authenticated users" ON public.budgets FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON public.budget_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.budget_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.budget_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for authenticated users" ON public.budget_items FOR DELETE TO authenticated USING (true);
