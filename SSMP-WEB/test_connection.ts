
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    console.log('--- Iniciando Teste de Conexão (Node.js) ---');
    console.log(`URL: ${supabaseUrl}`);

    // 1. Testar conexão básica com Supabase (Health Check)
    try {
        // Tentar listar users ou alguma tabela pública se possível, ou apenas verificar url
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Erro ao conectar com Supabase (Tabela profiles):', error.message);
        } else {
            console.log('✅ Conexão com Supabase estabelecida (Tabela profiles acessível/existente).');
        }
    } catch (err) {
        console.error('❌ Erro inesperado ao testar Supabase:', err);
    }

    // 2. Verificar URL de OAuth
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'http://localhost:5173/agenda',
                skipBrowserRedirect: true,
            },
        });

        if (error) {
            console.error('❌ Erro ao gerar URL de OAuth:', error.message);
        } else if (data?.url) {
            console.log('✅ URL de OAuth gerada com sucesso.');
            console.log('   URL:', data.url);
        }

    } catch (err) {
        console.error('❌ Erro ao testar Auth:', err);
    }

    console.log('--- Fim do Teste ---');
}

testConnection();
