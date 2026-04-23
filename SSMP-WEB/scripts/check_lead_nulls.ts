import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkNulls() {
    console.log("Checking for null clinic_id or campaign_id in leads...");

    const { data: nullClinic, error: errorC } = await supabase
        .from('leads')
        .select('id, name')
        .is('clinic_id', null);

    const { data: nullCampaign, error: errorCam } = await supabase
        .from('leads')
        .select('id, name')
        .is('campaign_id', null);

    if (errorC || errorCam) {
        console.error('❌ Error:', errorC?.message || errorCam?.message);
    } else {
        console.log(`- Leads with null clinic_id: ${nullClinic?.length || 0}`);
        console.log(`- Leads with null campaign_id: ${nullCampaign?.length || 0}`);

        if (nullClinic && nullClinic.length > 0) {
            console.log('Sample leads with null clinic_id:', nullClinic.slice(0, 3));
        }
    }
}

checkNulls();
