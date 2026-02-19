-- Add campaign_id to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;
