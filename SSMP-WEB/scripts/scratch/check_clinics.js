
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tofbruviyllvdmcllgjx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZmJydXZpeWxsdmRtY2xsZ2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI3NDIzNCwiZXhwIjoyMDg0ODUwMjM0fQ.WGLOB8iumtxy10EBn_8rjzTNQ6OONj7JeYlaOP0JYkI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClinics() {
  const { data, error } = await supabase
    .from('clinics')
    .select('id, fantasy_name, business_name');
  
  if (error) {
    console.error('Error fetching clinics:', error);
    return;
  }
  
  console.log('Clinics:', JSON.stringify(data, null, 2));
}

checkClinics();
