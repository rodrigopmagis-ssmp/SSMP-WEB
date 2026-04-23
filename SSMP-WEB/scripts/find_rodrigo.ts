import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findRodrigo() {
    console.log("Searching for lead 'Rodrigo Pereira'...");
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .ilike('name', '%Rodrigo%');

    if (error) {
        console.error('❌ Error searching leads:', error);
    } else {
        console.log(`✅ Found ${leads?.length || 0} matching leads.`);
        console.log(JSON.stringify(leads, null, 2));

        if (leads && leads.length > 0) {
            const leadId = leads[0].id;
            console.log(`Searching for negocios for lead_id: ${leadId}`);
            const { data: negocios, error: negError } = await supabase
                .from('negocios')
                .select('*')
                .eq('id_lead', leadId);

            if (!negError) {
                console.log('✅ Negocios for this lead:');
                console.log(JSON.stringify(negocios, null, 2));
            }
        }
    }
}

findRodrigo();
