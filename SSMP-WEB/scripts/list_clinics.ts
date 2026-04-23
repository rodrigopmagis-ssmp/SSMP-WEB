import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getClinics() {
    console.log("Listing available clinics...");
    const { data, error } = await supabase.from('clinics').select('id, fantasy_name');

    if (error) {
        console.error('❌ Error:', error.message);
    } else {
        console.log('✅ Clinics found:', data);
    }
}

getClinics();
