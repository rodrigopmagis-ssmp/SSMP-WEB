import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getAllLeads() {
    console.log("Checking all leads with whatsapp...");
    const { data, error } = await supabase.from('leads').select('id, name, whatsapp');

    if (error) {
        console.error('❌ Error:', error.message);
    } else {
        console.log(`✅ Found ${data.length} leads:`);
        console.table(data);
    }
}

getAllLeads();
