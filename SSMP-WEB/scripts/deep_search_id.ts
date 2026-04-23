import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const conversationId = 'eaf0eff1-3777-4466-ab27-f08bb2146f13';

async function deepSearch() {
    console.log(`Searching for '${conversationId}' in 'negocios' metadata...`);
    // Note: This approach might be limited by RLS if anon key is used
    const { data: negs, error: negErr } = await supabase
        .from('negocios')
        .select('*');

    if (negErr) {
        console.error('❌ Error getting negocios:', negErr);
    } else {
        console.log(`Found ${negs?.length || 0} negocios. Checking JSON...`);
        const matchingNegs = negs.filter(n => JSON.stringify(n).includes(conversationId));
        if (matchingNegs.length > 0) {
            console.log('✅ Found matching negocio:', JSON.stringify(matchingNegs[0], null, 2));
        } else {
            console.log('❌ Not found in negocios JSON.');
        }
    }

    console.log(`Searching for '${conversationId}' in 'leads' JSON...`);
    const { data: leads, error: leadErr } = await supabase
        .from('leads')
        .select('*');

    if (leadErr) {
        console.error('❌ Error getting leads:', leadErr);
    } else {
        console.log(`Found ${leads?.length || 0} leads. Checking JSON...`);
        const matchingLeads = leads.filter(l => JSON.stringify(l).includes(conversationId));
        if (matchingLeads.length > 0) {
            console.log('✅ Found matching lead:', JSON.stringify(matchingLeads[0], null, 2));
        } else {
            console.log('❌ Not found in leads JSON.');
        }
    }
}

deepSearch();
