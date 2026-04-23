import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probeMessages() {
    console.log('Probing columns for table "messages"...');
    // Using a hack to get column names if table is empty: query with a non-existent column
    const { data, error } = await supabase.from('messages').select('*').limit(1);

    if (data && data.length > 0) {
        console.log('✅ Found columns:', Object.keys(data[0]));
    } else {
        console.log('⚠️ Table empty, checking via error trick...');
        const { error: err2 } = await supabase.from('messages').select('non_existent_column_for_probing').limit(1);
        console.log('Error hint:', err2?.message);
    }
}

probeMessages();
