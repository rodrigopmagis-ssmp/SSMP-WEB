import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCampaignFK() {
    const campaignId = '5e142996-dd69-4f93-b8da-9b49f7fb73aa';
    console.log(`Testing if campaign ${campaignId} is valid...`);

    // Attempt to update a lead
    const { data: lead } = await supabase.from('leads').select('id').limit(1).single();
    if (!lead) return;

    const { error } = await supabase.from('leads').update({ campaign_id: campaignId }).eq('id', lead.id);

    if (error) {
        console.error('❌ Campaign ID is NOT valid or does not exist:', error.message);
    } else {
        console.log('✅ Success! The campaign ID is valid and exists.');
    }
}

testCampaignFK();
