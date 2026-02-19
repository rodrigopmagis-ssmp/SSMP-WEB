
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Using service role key if available for RLS bypass, otherwise anon
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugData() {
    console.log('--- LEADS (Last 5) ---');
    const { data: leads, error: leadError } = await supabase
        .from('leads')
        .select('id, name, campaign_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (leadError) console.error('Error fetching leads:', leadError);
    else console.table(leads);

    console.log('\n--- NEGOCIOS (Last 5) ---');
    const { data: deals, error: dealError } = await supabase
        .from('negocios')
        .select('id, nome, campaign_id, estagio, stage_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (dealError) console.error('Error fetching deals:', dealError);
    else console.table(deals);
}

debugData();
