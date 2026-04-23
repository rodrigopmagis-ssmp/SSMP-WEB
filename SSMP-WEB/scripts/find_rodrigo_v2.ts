import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findRodrigo() {
    console.log("Searching for 'Rodrigo' in 'leads' table...");
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .ilike('name', '%Rodrigo%');

    if (error) {
        console.error('❌ Error:', error);
    } else if (leads && leads.length > 0) {
        console.log(`✅ Found ${leads.length} leads:`);
        leads.forEach(l => {
            console.log(`- ID: ${l.id}, Name: ${l.name}, Meta:`, JSON.stringify(l.metadata, null, 2));
        });
    } else {
        console.log('❌ No leads found with "Rodrigo" in the name.');
    }

    console.log("\nSearching in 'negocios' table...");
    // Assuming 'negocios' table exists based on previous work
    const { data: negocios, error: negError } = await supabase
        .from('negocios')
        .select('*, lead:leads(*)')
        .ilike('nome', '%Rodrigo%'); // Assuming 'nome' is the column in negocios if it's there

    if (negError) {
        // Try 'name' if 'nome' fails
        const { data: negocios2, error: negError2 } = await supabase
            .from('negocios')
            .select('*, lead:leads(*)')
            .ilike('name', '%Rodrigo%');

        if (negError2) {
            console.error('❌ Error in negócios:', negError2);
        } else {
            displayNegocios(negocios2);
        }
    } else {
        displayNegocios(negocios);
    }
}

function displayNegocios(negocios: any[]) {
    if (negocios && negocios.length > 0) {
        console.log(`✅ Found ${negocios.length} negócios:`);
        negocios.forEach(n => {
            console.log(`- ID: ${n.id}, Name: ${n.nome || n.name}, LeadID: ${n.id_lead}, Meta:`, JSON.stringify(n.metadata, null, 2));
        });
    } else {
        console.log('❌ No negócios found with "Rodrigo" in the name.');
    }
}

findRodrigo();
