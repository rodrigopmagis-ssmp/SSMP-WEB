
const supabaseUrl = 'https://tofbruviyllvdmcllgjx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZmJydXZpeWxsdmRtY2xsZ2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI3NDIzNCwiZXhwIjoyMDg0ODUwMjM0fQ.WGLOB8iumtxy10EBn_8rjzTNQ6OONj7JeYlaOP0JYkI';

async function checkClinic() {
  const clinic_id = 'e70481d7-97a3-4e4c-ad71-1b753221b6cf';
  const response = await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinic_id}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  
  const data = await response.json();
  console.log('Clinic:', JSON.stringify(data, null, 2));
}

checkClinic();
