import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const conversationId = 'eaf0eff1-3777-4466-ab27-f08bb2146f13';

async function searchInProtocolData() {
    console.log(`Searching for '${conversationId}' in 'leads.protocol_data'...`);
    // Note: We use string search on the whole row if needed, or specific JSON path
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*');

    if (error) {
        console.error('❌ Error getting leads:', error);
    } else {
        const matches = leads.filter(l => JSON.stringify(l.protocol_data).includes(conversationId));
        if (matches.length > 0) {
            console.log('✅ Found matching lead:', matches[0].id, matches[0].name);
            console.log('Protocol Data:', JSON.stringify(matches[0].protocol_data, null, 2));
        } else {
            console.log('❌ Not found in protocol_data.');
        }
    }
}

searchInProtocolData();
