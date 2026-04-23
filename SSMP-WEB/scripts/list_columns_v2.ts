import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listColumns() {
    const tables = ['negocios', 'leads', 'atividades_negocios'];

    for (const table of tables) {
        console.log(`\nListing columns for '${table}'...`);
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.error(`❌ Error in ${table}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`✅ ${table} columns:`, Object.keys(data[0]));
        } else {
            console.log(`⚠️ ${table} is empty, cannot detect columns via select * limit 1.`);
        }
    }
}

listColumns();
