import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const conversationId = 'eaf0eff1-3777-4466-ab27-f08bb2146f13';

async function checkData() {
    console.log(`Checking table 'messages' for conversation_id: ${conversationId}`);
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .limit(5);

    if (error) {
        console.error('❌ Error querying messages:', error);
    } else {
        console.log(`✅ Found ${data?.length || 0} messages in 'messages' table.`);
        if (data && data.length > 0) {
            console.log('Sample data:', JSON.stringify(data[0], null, 2));
        }
    }

    console.log(`Checking table 'whatsapp_messages' for conversation_id: ${conversationId}`);
    const { data: dataWA, error: errorWA } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .limit(5);

    if (errorWA) {
        console.error('❌ Error querying whatsapp_messages:', errorWA);
    } else {
        console.log(`✅ Found ${dataWA?.length || 0} messages in 'whatsapp_messages' table.`);
        if (dataWA && dataWA.length > 0) {
            console.log('Sample data:', JSON.stringify(dataWA[0], null, 2));
        }
    }
}

checkData();
