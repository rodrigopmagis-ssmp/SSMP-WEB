
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllProfiles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, status, role, clinic_id');
        
    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }
    
    console.log('All Profiles:', JSON.stringify(data, null, 2));
}

listAllProfiles();
