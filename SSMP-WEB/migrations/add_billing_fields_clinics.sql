-- Add Business Name and Billing Address fields to clinics table

ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS billing_zip_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS billing_street VARCHAR(255),
ADD COLUMN IF NOT EXISTS billing_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS billing_complement VARCHAR(255),
ADD COLUMN IF NOT EXISTS billing_neighborhood VARCHAR(100),
ADD COLUMN IF NOT EXISTS billing_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS billing_state VARCHAR(2),
ADD COLUMN IF NOT EXISTS billing_country VARCHAR(50) DEFAULT 'Brasil',
ADD COLUMN IF NOT EXISTS same_address_for_billing BOOLEAN DEFAULT false; -- Kept for UI state persistence if needed, though mostly logic is frontend
