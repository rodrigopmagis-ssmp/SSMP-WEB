import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findAdmin() {
    console.log("Finding a valid user_id for dummy clinic creation...");
    const { data: users, error } = await supabase.from('profiles').select('id, role').eq('role', 'admin').limit(1);

    if (error || !users || users.length === 0) {
        // Fallback to any user
        const { data: anyUser } = await supabase.from('profiles').select('id').limit(1);
        console.log('Valid User ID found:', anyUser?.[0]?.id);
    } else {
        console.log('Admin User ID found:', users[0].id);
    }
}

findAdmin();
