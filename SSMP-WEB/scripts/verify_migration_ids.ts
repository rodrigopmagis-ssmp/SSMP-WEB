import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyIds() {
    const targetClinicId = 'e70481d7-97a3-4e4c-ad71-1b753221b6cf';
    const targetCampaignId = '5e142996-dd69-4f93-b8da-9b49f7fb73aa';

    console.log("Verifying IDs in parent tables...");

    const { data: clinic } = await supabase.from('clinics').select('id').eq('id', targetClinicId).maybeSingle();
    const { data: campaign } = await supabase.from('campaigns').select('id').eq('id', targetCampaignId).maybeSingle();

    console.log(`Clinic ${targetClinicId} exists: ${!!clinic}`);
    console.log(`Campaign ${targetCampaignId} exists: ${!!campaign}`);

    if (!clinic || !campaign) {
        console.log("\x1b[31mWarning: One or more IDs do not exist. Migration will fail due to Foreign Key constraints.\x1b[0m");
    }
}

verifyIds();
