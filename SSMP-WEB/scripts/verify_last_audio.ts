import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestMessage() {
    console.log('Fetching latest audio message...');
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('content_type', 'audio')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching message:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No audio messages found.');
        return;
    }

    const msg = data[0];
    console.log('--- LATEST AUDIO MESSAGE ---');
    console.log('ID:', msg.id);
    console.log('Content Type:', msg.content_type);
    console.log('Created At:', msg.created_at);
    console.log('Metadata Field (Raw):', JSON.stringify(msg.metadata, null, 2));

    let metadata = msg.metadata;
    if (typeof metadata === 'string') {
        try {
            metadata = JSON.parse(metadata);
            console.log('Metadata (Parsed):', JSON.stringify(metadata, null, 2));
        } catch (e) {
            console.log('Metadata is a string but not valid JSON');
        }
    }

    if (metadata?.media_url) {
        console.log('\x1b[32m%s\x1b[0m', 'Media URL Found: ' + metadata.media_url);
        if (metadata.media_url.includes('.enc')) {
            console.log('\x1b[31m%s\x1b[0m', '❌ CRITICAL: URL still points to .enc (encrypted WhatsApp servers)');
        } else if (metadata.media_url.includes('supabase.co')) {
            console.log('\x1b[32m%s\x1b[0m', '✅ SUCCESS: URL points to Supabase Storage');
        } else {
            console.log('URL points elsewhere:', metadata.media_url);
        }
    } else {
        console.log('\x1b[31m%s\x1b[0m', '❌ ERROR: No media_url found in metadata');
    }
}

checkLatestMessage();
