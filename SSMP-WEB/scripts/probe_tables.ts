import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listAllTables() {
    console.log("Listing all tables in public schema via RPC if possible, or guessing...");

    // Attempt to use postgrest to list tables is hard without direct SQL access.
    // We can try to query a non-existent table and see the error message if it lists suggestions (unlikely).
    // Or we can try to find common table names.

    const commonNames = [
        'messages', 'chat_messages', 'whatsapp_messages', 'negocios_mensagens',
        'atividades', 'atividades_negocios', 'logs', 'mensagens', 'conversas',
        'whatsapp_history', 'message_history'
    ];

    for (const name of commonNames) {
        const { error } = await supabase.from(name).select('count').limit(1);
        if (!error) {
            console.log(`✅ Table '${name}' EXISTS and is accessible.`);
        } else if (error.code !== '42P01') { // 42P01 is "relation does not exist"
            console.log(`🟡 Table '${name}' might exist but returned error: ${error.message} (Code: ${error.code})`);
        } else {
            // console.log(`❌ Table '${name}' does not exist.`);
        }
    }
}

listAllTables();
