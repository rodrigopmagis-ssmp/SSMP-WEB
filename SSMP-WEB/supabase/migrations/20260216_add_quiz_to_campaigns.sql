-- Add quiz_config and external_quiz_url columns to campaigns table

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS quiz_config JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS external_quiz_url TEXT DEFAULT NULL;

COMMENT ON COLUMN campaigns.quiz_config IS 'Configuration for the campaign-specific quiz (questions, final screen)';
COMMENT ON COLUMN campaigns.external_quiz_url IS 'URL to an external quiz if not using the internal builder';
