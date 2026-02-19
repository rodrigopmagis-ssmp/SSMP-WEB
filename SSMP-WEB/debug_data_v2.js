
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tofbruviyllvdmcllgjx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZmJydXZpeWxsdmRtY2xsZ2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNzQyMzQsImV4cCI6MjA4NDg1MDIzNH0.J9zVLpQrwGFY0QttRax1I9u6rtHaB9Qkt5lVUw63QuI';

const supabase = createClient(supabaseUrl, supabaseKey);


async function debugData() {
    // LOGIN FIRST
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@estheticco.com.br',
        password: 'admin'
    });

    if (authError) {
        console.error('LOGIN FAILED:', authError.message);
        return;
    }
    console.log('Logged in as:', authData.user.email);


    console.log('\n--- CAMPAIGNS ---');
    const { data: campaigns, error: campError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', 'd310d30d-5fdc-48f1-ba2d-43df266a9ec2'); // Filter by specific campaign

    if (campError) console.error('Error fetching campaigns:', campError);
    else {
        console.log(`Found ${campaigns.length} campaigns.`);
        campaigns.forEach(c => console.log(`- ID: ${c.id}\n  Name: ${c.name}\n  Clinic ID: ${c.clinic_id}\n  Active: ${c.is_active}`));

        if (campaigns.length > 0) {
            console.log('\n--- STAGES for this Campaign ---');
            const { data: stages } = await supabase
                .from('campaign_stages')
                .select('*')
                .eq('campaign_id', campaigns[0].id)
                .order('position');
            console.table(stages);
        }
    }

    console.log('\n--- LEADS (Last 5) ---');
    const { data: leads, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (leadError) console.error('Error fetching leads:', leadError);
    else {
        console.log('Recent Leads:');
        console.table(leads ? leads.map(l => ({ id: l.id, name: l.name, campaign: l.campaign_id, created: l.created_at })) : []);
    }

    console.log('\n--- NEGOCIOS (Last 5) ---');
    const { data: deals, error: dealError } = await supabase
        .from('negocios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (dealError) console.error('Error fetching deals:', dealError);
    else {
        console.log('Recent Deals:');
        console.table(deals ? deals.map(d => ({
            id: d.id,
            name: d.nome || d.name,
            campaign: d.campaign_id,
            stage: d.stage_id,
            clinic: d.id_clinica,
            estagio: d.estagio
        })) : []);
    }
}

debugData();
