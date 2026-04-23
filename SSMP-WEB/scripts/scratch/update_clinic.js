
const supabaseUrl = 'https://tofbruviyllvdmcllgjx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZmJydXZpeWxsdmRtY2xsZ2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI3NDIzNCwiZXhwIjoyMDg0ODUwMjM0fQ.WGLOB8iumtxy10EBn_8rjzTNQ6OONj7JeYlaOP0JYkI';

async function updateClinicName() {
  const clinicId = 'e70481d7-97a3-4e4c-ad71-1b753221b6cf';
  const newName = 'Dra Isabela Rossetti'; // Corrected L and T based on logo
  
  const response = await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ fantasy_name: newName })
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Error updating clinic:', error);
    return;
  }
  
  const data = await response.json();
  console.log('Updated Clinic:', JSON.stringify(data, null, 2));
}

updateClinicName();
