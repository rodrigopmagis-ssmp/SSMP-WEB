import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listSchemas() {
    console.log("Listing schemas via RPC...");
    const { data, error } = await supabase.rpc('get_schemas'); // Common pattern

    if (error) {
        console.error('❌ RPC Error:', error.message);
        // Fallback: try to guess or use a different method if possible
    } else {
        console.log('✅ Schemas:', data);
    }
}

listSchemas();
