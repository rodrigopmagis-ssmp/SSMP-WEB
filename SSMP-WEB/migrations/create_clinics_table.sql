-- Create clinics table
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(20) DEFAULT 'fisica', -- 'fisica' or 'juridica'
    
    -- Identification
    cpf_cnpj VARCHAR(20),
    fantasy_name VARCHAR(255),
    owner_name VARCHAR(255),
    
    -- Contact
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Address
    has_address BOOLEAN DEFAULT false,
    zip_code VARCHAR(10),
    street VARCHAR(255),
    number VARCHAR(20),
    complement VARCHAR(255),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    country VARCHAR(50) DEFAULT 'Brasil',
    
    -- Branding
    logo_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_clinic UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own clinic" ON public.clinics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clinic" ON public.clinics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clinic" ON public.clinics
    FOR UPDATE USING (auth.uid() = user_id);

-- Storage bucket for logos (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-logos', 'clinic-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Clinic Logos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'clinic-logos');

CREATE POLICY "Users can upload their own clinic logo" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'clinic-logos' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "Users can update their own clinic logo" ON storage.objects
  FOR UPDATE USING (bucket_id = 'clinic-logos' AND auth.uid() = (storage.foldername(name))[1]::uuid);
