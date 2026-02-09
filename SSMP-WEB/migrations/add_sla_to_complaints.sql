-- Migration: Add SLA columns to ombudsman_complaints
-- Description: Adds SLA tracking columns for automatic deadline calculation

ALTER TABLE ombudsman_complaints
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP,
ADD COLUMN IF NOT EXISTS sla_status VARCHAR(20) DEFAULT 'on_time',
ADD COLUMN IF NOT EXISTS sla_days INTEGER;

-- Update existing records with SLA deadlines based on severity
UPDATE ombudsman_complaints
SET sla_days = CASE 
    WHEN severity IN ('critica', 'alta') THEN 1
    WHEN severity = 'media' THEN 2
    WHEN severity = 'baixa' THEN 3
    ELSE 3
END
WHERE sla_days IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN ombudsman_complaints.sla_deadline IS 'Deadline for moving from nova to em_analise status';
COMMENT ON COLUMN ombudsman_complaints.sla_status IS 'SLA status: on_time, at_risk, overdue';
COMMENT ON COLUMN ombudsman_complaints.sla_days IS 'Number of business days for SLA';
