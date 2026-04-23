import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyMessages() {
    const targetUuid = 'eaf0eff1-3777-4466-ab27-f08bb2146f13';
    console.log(`Querying messages for conversation_id: ${targetUuid}...`);

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', targetUuid);

    if (error) {
        console.error('❌ Error:', error.message);
    } else if (data && data.length > 0) {
        console.log(`✅ Found ${data.length} messages.`);
        data.forEach(m => {
            console.log(JSON.stringify(m, null, 2));
        });
    } else {
        console.log('❌ No messages found for this UUID.');

        // Try to list any messages at all to see the schema
        console.log("\nListing any 2 messages from 'messages' table to check schema...");
        const { data: sample, error: sampleError } = await supabase.from('messages').select('*').limit(2);
        if (sampleError) console.error('Sample Error:', sampleError.message);
        else console.log('Sample data:', JSON.stringify(sample, null, 2));
    }
}

verifyMessages();
