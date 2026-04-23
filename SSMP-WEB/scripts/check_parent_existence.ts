import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkExistence() {
    const clinicId = 'e70481d7-97a3-4e4c-ad71-1b753221b6cf';
    const campaignId = '5e142996-dd69-4f93-b8da-9b49f7fb73aa';

    console.log(`Checking clinic: ${clinicId}`);
    const { data: clinic, error: cError } = await supabase.from('clinics').select('id').eq('id', clinicId).maybeSingle();
    if (cError) console.error('Clinic Error:', cError.message);
    else console.log('Clinic exists:', !!clinic);

    console.log(`Checking campaign: ${campaignId}`);
    const { data: campaign, error: camError } = await supabase.from('campaigns').select('id').eq('id', campaignId).maybeSingle();
    if (camError) console.error('Campaign Error:', camError.message);
    else console.log('Campaign exists:', !!campaign);
}

checkExistence();
