import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkNegociosMensagens() {
    console.log("Checking first 5 rows of 'negocios_mensagens' table...");
    const { data, error } = await supabase
        .from('negocios_mensagens')
        .select('*')
        .limit(5);

    if (error) {
        console.error('❌ Error querying negocios_mensagens:', error);
    } else {
        console.log('✅ Sample data from negocios_mensagens:');
        console.log(JSON.stringify(data, null, 2));
    }
}

checkNegociosMensagens();
