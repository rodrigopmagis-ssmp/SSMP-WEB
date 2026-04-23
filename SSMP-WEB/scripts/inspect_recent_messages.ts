import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectRecentMessages() {
    console.log("Checking last 10 messages from 'messages' table...");
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Error in messages:', error);
    } else if (messages && messages.length > 0) {
        console.log(`✅ Found ${messages.length} messages:`);
        messages.forEach(m => {
            console.log(`- ID: ${m.id}, ConvID: ${m.conversation_id}, From: ${m.sender || m.direction}, Text: ${m.text || m.content}`);
        });
    } else {
        console.log('❌ No messages found in "messages" table.');
    }

    console.log("\nChecking last 10 messages from 'negocios_mensagens' table...");
    const { data: negMessages, error: negError } = await supabase
        .from('negocios_mensagens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (negError) {
        console.warn('⚠️ negocios_mensagens might not exist or empty:', negError.message);
    } else if (negMessages && negMessages.length > 0) {
        console.log(`✅ Found ${negMessages.length} messages in negocios_mensagens:`);
        negMessages.forEach(m => {
            console.log(`- ID: ${m.id}, ConvID: ${m.conversation_id}, From: ${m.sender || m.direction}, Text: ${m.text || m.content}`);
        });
    } else {
        console.log('❌ No messages found in "negocios_mensagens" table.');
    }
}

inspectRecentMessages();
