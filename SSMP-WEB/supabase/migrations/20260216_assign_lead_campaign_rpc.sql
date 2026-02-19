-- Create a secure function to update lead campaign
-- This function runs with SECURITY DEFINER privileges (admin) to bypass RLS for anonymous users

CREATE OR REPLACE FUNCTION public.assign_lead_to_campaign(
    lead_id UUID,
    campaign_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_lead JSONB;
BEGIN
    -- Update the lead with the provided campaign_id
    UPDATE public.leads
    SET campaign_id = assign_lead_to_campaign.campaign_id
    WHERE id = assign_lead_to_campaign.lead_id
    RETURNING to_jsonb(leads.*) INTO updated_lead;

    RETURN updated_lead;
END;
$$;
