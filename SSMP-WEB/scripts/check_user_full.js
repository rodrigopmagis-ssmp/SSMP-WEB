
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './SSMP-WEB/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserAndClinic() {
    const email = 'amandadossantos1403@gmail.com';
    
    // 1. Get user profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
        
    if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
    }
    
    console.log('User Profile:', JSON.stringify(profile, null, 2));
    
    // 2. Get clinic details
    if (profile.clinic_id) {
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('*')
            .eq('id', profile.clinic_id)
            .single();
            
        if (clinicError) {
            console.error('Error fetching clinic:', clinicError);
        } else {
            console.log('User Clinic:', JSON.stringify(clinic, null, 2));
        }
    } else {
        console.log('User has NO clinic_id!');
    }
    
    // 3. Check if there are other clinics with similar name
    const { data: allClinics, error: allClinicsError } = await supabase
        .from('clinics')
        .select('*');
        
    console.log('All Clinics:', JSON.stringify(allClinics, null, 2));
}

checkUserAndClinic();
