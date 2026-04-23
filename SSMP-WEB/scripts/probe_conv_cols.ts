import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probeConversations() {
    console.log("Probing columns for table 'conversations'...");
    // Probe common update columns
    const columns = ['id', 'lead_id', 'clinic_id', 'status', 'created_at', 'updated_at', 'last_message_at', 'last_interaction_at'];
    const existing = [];

    for (const col of columns) {
        const { error } = await supabase.from('conversations').select(col).limit(0);
        if (!error) {
            existing.push(col);
        }
    }

    console.log(`✅ Detected columns: [ ${existing.join(', ')} ]`);
}

probeConversations();
