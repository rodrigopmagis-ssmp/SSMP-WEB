import { supabase } from './supabase';
import { Procedure, ScriptStage } from '../types';

export interface DatabaseProcedure {
    id: string;
    user_id: string;
    name: string;
    icon: string;
    description: string | null;
    scripts: ScriptStage[];
    created_at: string;
    updated_at: string;
}

function dbProcedureToProcedure(dbProcedure: DatabaseProcedure): Procedure {
    return {
        id: dbProcedure.id,
        name: dbProcedure.name,
        icon: dbProcedure.icon,
        description: dbProcedure.description || '',
        scripts: dbProcedure.scripts,
    };
}

function procedureToDbProcedure(procedure: Omit<Procedure, 'id'>): Omit<DatabaseProcedure, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
    return {
        name: procedure.name,
        icon: procedure.icon,
        description: procedure.description || null,
        scripts: procedure.scripts,
    };
}

export async function fetchProcedures(): Promise<Procedure[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching procedures:', error);
        throw error;
    }

    return (data as DatabaseProcedure[]).map(dbProcedureToProcedure);
}

export async function createProcedure(procedure: Omit<Procedure, 'id'>): Promise<Procedure> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const dbProcedure = procedureToDbProcedure(procedure);

    const { data, error } = await supabase
        .from('procedures')
        .insert([{ ...dbProcedure, user_id: user.id }])
        .select()
        .single();

    if (error) {
        console.error('Error creating procedure:', error);
        throw error;
    }

    return dbProcedureToProcedure(data as DatabaseProcedure);
}

export async function updateProcedure(id: string, updates: Partial<Procedure>): Promise<Procedure> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const dbUpdates: any = {};

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;
    if (updates.scripts !== undefined) dbUpdates.scripts = updates.scripts;

    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from('procedures')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) {
        console.error('Error updating procedure:', error);
        throw error;
    }

    return dbProcedureToProcedure(data as DatabaseProcedure);
}

export async function deleteProcedure(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { error } = await supabase
        .from('procedures')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting procedure:', error);
        throw error;
    }
}
