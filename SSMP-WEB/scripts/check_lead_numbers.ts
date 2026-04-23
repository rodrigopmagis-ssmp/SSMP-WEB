import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLeadNumbers() {
    console.log("Checking lead whatsapp formats...");
    const { data, error } = await supabase.from('leads').select('name, whatsapp').limit(5);

    if (error) {
        console.error('❌ Error:', error.message);
    } else {
        console.log('✅ Sample leads:');
        console.table(data);
    }
}

checkLeadNumbers();
