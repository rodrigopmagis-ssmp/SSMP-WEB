
const supabaseUrl = 'https://tofbruviyllvdmcllgjx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZmJydXZpeWxsdmRtY2xsZ2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI3NDIzNCwiZXhwIjoyMDg0ODUwMjM0fQ.WGLOB8iumtxy10EBn_8rjzTNQ6OONj7JeYlaOP0JYkI';

async function checkUser() {
  const email = 'amandadossantos1403@gmail.com';
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${email}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Error fetching user:', error);
    return;
  }
  
  const data = await response.json();
  console.log('User Profile:', JSON.stringify(data, null, 2));
}

checkUser();
