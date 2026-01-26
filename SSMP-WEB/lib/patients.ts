import { supabase } from './supabase';
import { Patient, PatientStatus } from '../types';

export interface DatabasePatient {
    id: string;
    user_id: string;
    name: string;
    phone: string;
    email: string | null;
    dob: string | null;
    cpf: string | null;
    procedures: string[];
    procedure_date: string | null;
    last_visit: string;
    status: string;
    photos: string[];
    avatar: string | null;
    created_at: string;
    updated_at: string;
}

function dbPatientToPatient(dbPatient: DatabasePatient): Patient {
    return {
        id: dbPatient.id,
        name: dbPatient.name,
        phone: dbPatient.phone,
        email: dbPatient.email || '',
        dob: dbPatient.dob || '',
        cpf: dbPatient.cpf,
        procedures: dbPatient.procedures,
        procedureDate: dbPatient.procedure_date || '',
        lastVisit: dbPatient.last_visit,
        status: dbPatient.status as PatientStatus,
        photos: dbPatient.photos,
        avatar: dbPatient.avatar || undefined,
    };
}

function patientToDbPatient(patient: Omit<Patient, 'id'>): Omit<DatabasePatient, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
    return {
        name: patient.name,
        phone: patient.phone,
        email: patient.email || null,
        dob: patient.dob || null,
        cpf: patient.cpf || null,
        procedures: patient.procedures,
        procedure_date: patient.procedureDate || null,
        last_visit: patient.lastVisit,
        status: patient.status,
        photos: patient.photos,
        avatar: patient.avatar || null,
    };
}

export async function fetchPatients(): Promise<Patient[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching patients:', error);
        throw error;
    }

    const { data: treatments } = await supabase
        .from('patient_treatments')
        .select('patient_id, status, tasks_completed, total_tasks');

    const treatmentStats = (treatments || []).reduce((acc, t) => {
        if (!acc[t.patient_id]) {
            acc[t.patient_id] = { active: 0, completed: 0, tasksCompleted: 0, totalTasks: 0 };
        }
        if (t.status === 'active') acc[t.patient_id].active++;
        if (t.status === 'completed') acc[t.patient_id].completed++;

        // Sum up tasks for progress calculation (active treatments only for "current work" or all? Using all gives better history context)
        // User asked "how many follow-ups need to be done", so maybe focus on active?
        // Let's sum ALL for now to match the "Progress" concept of the patient's journey.
        acc[t.patient_id].tasksCompleted += (t.tasks_completed || 0);
        acc[t.patient_id].totalTasks += (t.total_tasks || 0);

        return acc;
    }, {} as Record<string, { active: number, completed: number, tasksCompleted: number, totalTasks: number }>);

    return (data as DatabasePatient[]).map(dbP => {
        const p = dbPatientToPatient(dbP);
        const stats = treatmentStats[p.id] || { active: 0, completed: 0, tasksCompleted: 0, totalTasks: 0 };
        return {
            ...p,
            activeTreatmentsCount: stats.active,
            completedTreatmentsCount: stats.completed,
            tasksCompleted: stats.tasksCompleted,
            totalTasks: stats.totalTasks,
            progress: stats.totalTasks > 0 ? Math.round((stats.tasksCompleted / stats.totalTasks) * 100) : 0
        };
    });
}

export async function createPatient(patient: Omit<Patient, 'id'>): Promise<Patient> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const dbPatient = patientToDbPatient(patient);

    const { data, error } = await supabase
        .from('patients')
        .insert([{ ...dbPatient, user_id: user.id }])
        .select()
        .single();

    if (error) {
        console.error('Error creating patient:', error);
        throw error;
    }

    return dbPatientToPatient(data as DatabasePatient);
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const dbUpdates: any = {};

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email || null;
    if (updates.dob !== undefined) dbUpdates.dob = updates.dob || null;
    if (updates.cpf !== undefined) dbUpdates.cpf = updates.cpf || null;
    if (updates.procedures !== undefined) dbUpdates.procedures = updates.procedures;
    if (updates.procedureDate !== undefined) dbUpdates.procedure_date = updates.procedureDate || null;
    if (updates.lastVisit !== undefined) dbUpdates.last_visit = updates.lastVisit;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.photos !== undefined) dbUpdates.photos = updates.photos;
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar || null;

    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from('patients')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) {
        console.error('Error updating patient:', error);
        throw error;
    }

    return dbPatientToPatient(data as DatabasePatient);
}

export async function deletePatient(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting patient:', error);
        throw error;
    }
}
