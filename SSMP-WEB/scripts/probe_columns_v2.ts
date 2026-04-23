import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probeColumns() {
    const table = 'messages';
    const candidateColumns = [
        'conversation_id', 'negocio_id', 'lead_id', 'id_negocio', 'id_lead',
        'whatsapp', 'phone', 'to', 'from', 'sender', 'text', 'content', 'message',
        'direction', 'status', 'created_at', 'timestamp'
    ];

    console.log(`Probing columns for table '${table}'...`);
    const existingColumns: string[] = [];

    for (const col of candidateColumns) {
        const { error } = await supabase.from(table).select(col).limit(1);
        if (!error || (error.code !== '42703')) { // 42703 is "column does not exist"
            existingColumns.push(col);
        }
    }

    console.log(`✅ Detected existing columns in '${table}':`, existingColumns);
}

probeColumns();
