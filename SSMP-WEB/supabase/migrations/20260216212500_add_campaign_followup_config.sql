-- Add followup_config column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS followup_config JSONB DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN campaigns.followup_config IS 'List of follow-up stages (script stages) for this campaign';
