
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tofbruviyllvdmcllgjx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZmJydXZpeWxsdmRtY2xsZ2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNzQyMzQsImV4cCI6MjA4NDg1MDIzNH0.J9zVLpQrwGFY0QttRax1I9u6rtHaB9Qkt5lVUw63QuI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
    console.log('Creating dummy treatment...');

    // We need a valid patient ID. Let's fetch one.
    const { data: patients } = await supabase.from('patients').select('id').limit(1);
    if (!patients || patients.length === 0) {
        console.error('No patients found to attach treatment to.');
        return;
    }
    const patientId = patients[0].id;

    const { data: treatment, error: createError } = await supabase
        .from('patient_treatments')
        .insert([{
            patient_id: patientId,
            procedure_name: 'DELETE_TEST',
            status: 'active',
            started_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (createError) {
        console.error('Create failed:', createError);
        return;
    }

    console.log('Created treatment:', treatment.id);
    console.log('Attempting delete...');

    const { error: deleteError } = await supabase
        .from('patient_treatments')
        .delete()
        .eq('id', treatment.id);

    if (deleteError) {
        console.error('Delete failed:', deleteError);
    } else {
        console.log('Delete successful!');
    }
}

testDelete();
