import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listTables() {
    console.log('Fetching table list...');
    // This is a trick to get table names from the API schema if we don't have direct SQL access
    // But since Supabase JS doesn't have a direct "list tables" method, we'll try common names
    const commonTables = [
        'messages', 'whatsapp_messages', 'negocios_mensagens', 'deals_messages',
        'lead_messages', 'atividades_negocios', 'negocios', 'leads', 'patient_messages'
    ];

    for (const table of commonTables) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (!error) {
            console.log(`✅ Table exists: ${table}`);
        } else if (error.code !== 'PGRST116' && error.code !== '42P01') {
            // PGRST116 is usually "no rows", 42P01 is "relation does not exist"
            console.log(`❓ Table ${table} returned error: ${error.code} - ${error.message}`);
        } else {
            console.log(`❌ Table does not exist: ${table}`);
        }
    }
}

listTables();
