
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tofbruviyllvdmcllgjx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZmJydXZpeWxsdmRtY2xsZ2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNzQyMzQsImV4cCI6MjA4NDg1MDIzNH0.J9zVLpQrwGFY0QttRax1I9u6rtHaB9Qkt5lVUw63QuI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProcedures() {
    const { data, error } = await supabase.from('procedures').select('*');
    if (error) {
        console.error('Error fetching procedures:', error);
        return;
    }

    data.forEach((p) => {
        console.log(`Procedure: ${p.name} (ID: ${p.id})`);
        console.log(`Scripts count: ${(p.scripts || []).length}`);
        if (p.scripts) {
            p.scripts.forEach((s, i) => {
                console.log(`  [${i}] ${s.title} (ID: ${s.id})`);
            });
        }
        console.log('---');
    });
}

inspectProcedures();
