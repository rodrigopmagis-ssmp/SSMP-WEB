import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSearch(number: string) {
    console.log(`Testing searches for: ${number}`);

    // 1. Raw search
    const { data: raw } = await supabase.from('leads').select('id, name, whatsapp').eq('whatsapp', number);
    console.log(`- Exact match: ${raw?.length || 0} found`);

    // 2. Search without country code (last 11 digits)
    const short = number.slice(-11);
    const { data: normalized } = await supabase.from('leads').select('id, name, whatsapp').ilike('whatsapp', `%${short}`);
    console.log(`- Like %${short} match: ${normalized?.length || 0} found`);
    if (normalized && normalized.length > 0) {
        console.log('  Matches found:', normalized);
    }

    // 3. Search with '+' prefix
    const withPlus = '+' + number;
    const { data: plusMatch } = await supabase.from('leads').select('id, name, whatsapp').eq('whatsapp', withPlus);
    console.log(`- Exact match for ${withPlus}: ${plusMatch?.length || 0} found`);
}

// Example number from user logs or a typical one
testSearch('5511999999999'); // Adjust if you have a real number to test
