import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260211_create_budgets_tables.sql');

    try {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        console.log(`Executing migration from ${migrationPath}...`);

        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('Error running migration via RPC:', error);
            process.exit(1);
        } else {
            console.log('Migration executed successfully via RPC!');
        }
    } catch (err) {
        console.error('File read error:', err);
        process.exit(1);
    }
}

runMigration();
