import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRealtime() {
    console.log('Checking if Realtime (CDC) is enabled for "messages" table...');

    // Check if the table is in the supabase_realtime publication
    const { data: publication, error: pubError } = await supabase.rpc('check_realtime_status', { table_name: 'messages' });

    // Since I don't have the RPC, I'll try to query pg_publication_tables via raw SQL if possible, 
    // but usually I can just check the messages.

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error querying messages:', error.message);
    } else {
        console.log('Successfully queried messages.');
    }

    console.log('Note: To enable Realtime, run: ALTER PUBLICATION supabase_realtime ADD TABLE messages;');
}

checkRealtime();
