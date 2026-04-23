import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findLeadByConv() {
    const convId = 'eaf0eff1-3777-4466-ab27-f08bb2146f13';
    console.log(`Searching for lead associated with conversation ${convId}...`);

    const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('lead_id')
        .eq('id', convId)
        .single();

    if (convError) {
        console.error('❌ Conv Error:', convError.message);
        return;
    }

    console.log(`✅ Found lead_id: ${conv.lead_id}`);

    const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', conv.lead_id)
        .single();

    if (leadError) {
        console.error('❌ Lead Error:', leadError.message);
    } else {
        console.log('✅ Lead details:');
        console.log(JSON.stringify(lead, null, 2));
    }
}

findLeadByConv();
