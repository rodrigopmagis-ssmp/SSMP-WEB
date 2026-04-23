import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findRodrigo() {
    console.log("Searching for 'Rodrigo Pereira' in leads...");
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .ilike('name', '%Rodrigo Pereira%');

    if (error) {
        console.error('❌ Error:', error.message);
    } else {
        console.log(`✅ Found ${data?.length} leads:`);
        console.log(JSON.stringify(data, null, 2));
    }
}

findRodrigo();
