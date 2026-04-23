import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probeMessageColumnsExhaustive() {
    const table = 'messages';
    // More precise candidates based on common chat schema
    const candidates = [
        'sender', 'direction', 'type', 'metadata', 'payload', 'from', 'to',
        'is_outgoing', 'status', 'error', 'external_id', 'ref', 'msg_type', 'body'
    ];

    console.log(`Exhaustive probing for table '${table}'...`);
    const found: string[] = [];
    for (const col of candidates) {
        const { error } = await supabase.from(table).select(col).limit(1);
        if (!error || error.code !== '42703') found.push(col);
    }
    console.log(`✅ Additional columns in '${table}':`, found);
}

probeMessageColumnsExhaustive();
