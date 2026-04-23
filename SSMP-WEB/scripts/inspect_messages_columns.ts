import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectColumns() {
    console.log("Inspecting columns of the 'messages' table via sample query...");
    const { data, error } = await supabase.from('messages').select('*').limit(1);

    if (error) {
        console.error('❌ Error:', error);
    } else if (data && data.length > 0) {
        console.log('✅ Found columns:', Object.keys(data[0]));
    } else {
        console.log('⚠️ Table is empty. Trying to guess columns or check if it exists in another way...');
        // We can't easily get column names for an empty table via JS client without RPC or SQL.
    }
}

inspectColumns();
