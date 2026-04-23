import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listSchemas() {
    console.log("Attempting to list schemas via common table checks...");
    // Since we can't easily list schemas via JS client without SQL, 
    // let's try to query some standard tables in common schemas.
    const schemasToTry = ['public', 'crm', 'deals', 'whatsapp', 'evolution'];

    for (const schema of schemasToTry) {
        const { data, error } = await supabase
            .from(`${schema}.negocios`) // This syntax works in some PostgREST setups if published
            .select('*')
            .limit(1);

        if (!error) {
            console.log(`✅ Schema '${schema}' might have 'negocios' table.`);
        } else {
            console.log(`❌ Schema '${schema}' check failed: ${error.message} (${error.code})`);
        }
    }
}

listSchemas();
