import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getCampaigns() {
    console.log("Listing available campaigns...");
    const { data, error } = await supabase.from('campaigns').select('id, name, clinic_id');

    if (error) {
        console.error('❌ Error:', error.message);
    } else {
        console.log(`✅ Campaigns found (${data?.length || 0}):`, data);
    }
}

getCampaigns();
