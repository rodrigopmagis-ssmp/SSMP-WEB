import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probeCrmColumns() {
    const tableLeads = 'leads';
    const tableNegocios = 'negocios';
    const leadsCandidates = ['id', 'whatsapp', 'phone', 'metadata', 'metadados', 'name', 'nome', 'id_whatsapp', 'conversation_id'];
    const negociosCandidates = ['id', 'id_lead', 'lead_id', 'metadata', 'metadados', 'id_clinica', 'vendedor_id', 'id_vendedor'];

    console.log(`Probing columns for table '${tableLeads}'...`);
    const leadsCols: string[] = [];
    for (const col of leadsCandidates) {
        const { error } = await supabase.from(tableLeads).select(col).limit(1);
        if (!error || (error.code !== '42703')) leadsCols.push(col);
    }
    console.log(`✅ Leads columns:`, leadsCols);

    console.log(`Probing columns for table '${tableNegocios}'...`);
    const negsCols: string[] = [];
    for (const col of negociosCandidates) {
        const { error } = await supabase.from(tableNegocios).select(col).limit(1);
        if (!error || (error.code !== '42703')) negsCols.push(col);
    }
    console.log(`✅ Negocios columns:`, negsCols);
}

probeCrmColumns();
