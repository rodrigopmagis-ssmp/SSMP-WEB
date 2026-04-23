import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFK() {
    const clinicId = 'e70481d7-97a3-4e4c-ad71-1b753221b6cf';
    console.log(`Testing if clinic ${clinicId} is valid by updating one lead...`);

    // Attempt to update the first lead
    const { data: lead } = await supabase.from('leads').select('id').limit(1).single();
    if (!lead) {
        console.log('No leads found to test.');
        return;
    }

    const { error } = await supabase.from('leads').update({ clinic_id: clinicId }).eq('id', lead.id);

    if (error) {
        console.error('❌ Failed to update lead:', error.message);
    } else {
        console.log('✅ Success! The clinic ID is valid and exists in the database.');
    }
}

testFK();
