import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectTable() {
    console.log("Checking first 5 rows of 'messages' table...");
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .limit(5);

    if (error) {
        console.error('❌ Error querying messages:', error);
    } else {
        console.log('✅ Sample data from messages:');
        console.log(JSON.stringify(data, null, 2));
    }

    console.log("Checking 'atividades_negocios' for potential message-like data...");
    const { data: dataAtiv, error: errorAtiv } = await supabase
        .from('atividades_negocios')
        .select('*')
        .limit(3);

    if (!errorAtiv) {
        console.log('✅ Sample data from atividades_negocios:');
        console.log(JSON.stringify(dataAtiv, null, 2));
    }
}

inspectTable();
