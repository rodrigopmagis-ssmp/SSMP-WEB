import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERRO: Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são necessárias');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🚀 Executando migration: create_negocios_tables_ptbr.sql\n');

    try {
        const migrationPath = resolve(process.cwd(), 'migrations', 'create_negocios_tables_ptbr.sql');
        const sql = readFileSync(migrationPath, 'utf-8');

        console.log('📄 Lendo arquivo SQL...');
        console.log(`📁 Caminho: ${migrationPath}\n`);

        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Erro ao executar migration:', error);
            process.exit(1);
        }

        console.log('✅ Migration executada com sucesso!');
        console.log('\n📋 Tabelas criadas:');
        console.log('   - negocios (com campos em PT-BR)');
        console.log('   - atividades_negocios (com campos em PT-BR)');
        console.log('\n🎉 Banco de dados atualizado!\n');

    } catch (err) {
        console.error('❌ Erro:', err);
        process.exit(1);
    }
}

runMigration();
