
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listClinics() {
    const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .limit(10);
        
    if (error) {
        console.error('Error listing clinics:', error);
        return;
    }
    
    console.log('Clinics:', JSON.stringify(data, null, 2));
}

listClinics();
