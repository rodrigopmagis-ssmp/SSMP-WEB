import { supabase } from '../lib/supabase';
import { Patient, Procedure, PatientTreatment, SurveyStatus, TreatmentLog } from '../../types';
import { PROCEDURES as INITIAL_PROCEDURES } from '../../constants';

export const supabaseService = {
    // --- Patients ---

    async getPatients() {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapDbToPatient);
    },

    async createPatient(patient: Partial<Patient>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const dbPatient = {
            name: patient.name,
            phone: patient.phone,
            email: patient.email,
            dob: patient.dob,
            cpf: patient.cpf,
            procedures: patient.procedures,
            procedure_date: patient.procedureDate,
            last_visit: patient.lastVisit,
            status: patient.status,
            progress: patient.progress,
            tasks_completed: patient.tasksCompleted,
            total_tasks: patient.totalTasks,
            photos: patient.photos,
            avatar: patient.avatar,
            user_id: user.id
        };

        const { data, error } = await supabase
            .from('patients')
            .insert([dbPatient])
            .select()
            .single();

        if (error) throw error;
        return mapDbToPatient(data);
    },

    async updatePatient(id: string, updates: Partial<Patient>) {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.dob !== undefined) dbUpdates.dob = updates.dob;
        if (updates.cpf !== undefined) dbUpdates.cpf = updates.cpf;
        if (updates.procedures !== undefined) dbUpdates.procedures = updates.procedures;
        if (updates.procedureDate !== undefined) dbUpdates.procedure_date = updates.procedureDate;
        if (updates.lastVisit !== undefined) dbUpdates.last_visit = updates.lastVisit;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
        if (updates.tasksCompleted !== undefined) dbUpdates.tasks_completed = updates.tasksCompleted;
        if (updates.totalTasks !== undefined) dbUpdates.total_tasks = updates.totalTasks;
        if (updates.photos !== undefined) dbUpdates.photos = updates.photos;
        if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
        if (updates.survey !== undefined) dbUpdates.survey = updates.survey;
        if (updates.stageData !== undefined) dbUpdates.stage_data = updates.stageData;

        const { data, error } = await supabase
            .from('patients')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapDbToPatient(data);
    },

    async updatePatientAvatar(id: string, avatarUrl: string) {
        const { data, error } = await supabase
            .from('patients')
            .update({ avatar: avatarUrl })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapDbToPatient(data);
    },

    // --- Procedures ---

    async getProcedures(activeOnly: boolean = false) {
        let query = supabase
            .from('procedures')
            .select('*')
            .order('name', { ascending: true });

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Procedure[];
    },

    async seedProcedures() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const proceduresToInsert = INITIAL_PROCEDURES.map(p => ({
            name: p.name,
            icon: p.icon,
            description: p.description,
            scripts: p.scripts,
            user_id: user.id
        }));

        // Upsert allows us to ignore duplicates if they exist (based on the unique constraint we just added)
        const { error } = await supabase
            .from('procedures')
            .upsert(proceduresToInsert, { onConflict: 'user_id, name', ignoreDuplicates: true });

        if (error) throw error;
        return true;
    },

    async createProcedure(procedure: Procedure) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Check if procedure with same name already exists
        const { data: existingProcedure } = await supabase
            .from('procedures')
            .select('id, name')
            .ilike('name', procedure.name)
            .single();

        if (existingProcedure) {
            throw new Error(`Já existe um procedimento cadastrado com o nome "${procedure.name}". Por favor, escolha outro nome.`);
        }

        const dbProcedure = {
            name: procedure.name,
            icon: procedure.icon,
            description: procedure.description,
            scripts: procedure.scripts || [],
            user_id: user.id,
            is_active: true
        };

        const { data, error } = await supabase
            .from('procedures')
            .insert([dbProcedure])
            .select()
            .single();

        if (error) {
            // Handle unique constraint violation from database
            if (error.code === '23505') {
                throw new Error(`Já existe um procedimento cadastrado com o nome "${procedure.name}". Por favor, escolha outro nome.`);
            }
            throw error;
        }
        return data as Procedure;
    },

    async updateProcedure(procedure: Procedure) {
        const dbProcedure = {
            name: procedure.name,
            icon: procedure.icon,
            description: procedure.description,
            scripts: procedure.scripts,
        };

        const { data, error } = await supabase
            .from('procedures')
            .update(dbProcedure)
            .eq('id', procedure.id)
            .select()
            .single();

        if (error) throw error;
        return data as Procedure;
    },


    async checkProcedureUsage(procedureId: string) {
        // Check ALL treatments (both active and completed) to prevent history loss
        const { data, error } = await supabase
            .from('patient_treatments')
            .select('status')
            .eq('procedure_id', procedureId);

        if (error) throw error;

        if (!data || data.length === 0) {
            return { total: 0, active: 0, completed: 0 };
        }

        const active = data.filter(t => t.status === 'active').length;
        const completed = data.filter(t => t.status === 'completed').length;

        return {
            total: data.length,
            active,
            completed
        };
    },

    async deleteProcedure(id: string) {
        // Check if procedure is being used in ANY treatments (active or completed)
        const usage = await this.checkProcedureUsage(id);

        if (usage.total > 0) {
            const parts = [];
            if (usage.active > 0) parts.push(`${usage.active} ativo(s)`);
            if (usage.completed > 0) parts.push(`${usage.completed} concluído(s)`);

            throw new Error(
                `Não é possível excluir. Este procedimento possui ${usage.total} protocolo(s) registrado(s) [${parts.join(', ')}]. ` +
                `Excluir o procedimento apagaria permanentemente o histórico desses pacientes.`
            );
        }

        const { error } = await supabase
            .from('procedures')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    async inactivateProcedure(id: string, isActive: boolean) {
        const { data, error } = await supabase
            .from('procedures')
            .update({ is_active: isActive })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Procedure;
    },

    // --- Patient Treatments (New multi-protocol support) ---

    async getPatientTreatments(patientId: string) {
        const { data, error } = await supabase
            .from('patient_treatments')
            .select('*')
            .eq('patient_id', patientId)
            .order('started_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapDbToTreatment);
    },

    async getAllActiveTreatments() {
        const { data, error } = await supabase
            .from('patient_treatments')
            .select('*')
            .eq('status', 'active') // Fetch only active
            .order('started_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapDbToTreatment);
    },

    async createTreatment(treatment: Partial<PatientTreatment>) {
        // Inject scripts snapshot into stage_data to avoid schema changes
        const stageDataWithSnapshot = {
            ...(treatment.stageData || {}),
            _scriptsSnapshot: treatment.scripts
        };

        const dbTreatment = {
            patient_id: treatment.patientId,
            procedure_id: treatment.procedureId,
            procedure_name: treatment.procedureName,
            started_at: treatment.startedAt,
            status: treatment.status,
            tasks_completed: treatment.tasksCompleted,
            total_tasks: treatment.totalTasks,
            progress: treatment.progress,
            stage_data: stageDataWithSnapshot,
            survey_status: treatment.surveyStatus,
            survey_data: treatment.surveyData
        };

        const { data, error } = await supabase
            .from('patient_treatments')
            .insert([dbTreatment])
            .select()
            .single();

        if (error) throw error;
        return mapDbToTreatment(data);
    },

    async updateTreatment(id: string, updates: Partial<PatientTreatment>) {
        const dbUpdates: any = {};
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.tasksCompleted !== undefined) dbUpdates.tasks_completed = updates.tasksCompleted;
        if (updates.totalTasks !== undefined) dbUpdates.total_tasks = updates.totalTasks;
        if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
        if (updates.stageData !== undefined) dbUpdates.stage_data = updates.stageData;
        if (updates.surveyStatus !== undefined) dbUpdates.survey_status = updates.surveyStatus;
        if (updates.surveyData !== undefined) dbUpdates.survey_data = updates.surveyData;

        dbUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('patient_treatments')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapDbToTreatment(data);
    },

    async deleteTreatment(id: string) {
        const { error } = await supabase
            .from('patient_treatments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // --- Clinical Notes ---

    async getPatientNotes(patientId: string) {
        const { data, error } = await supabase
            .from('clinical_notes')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as any[]; // Mapped if strictly needed, but structure matches closely
    },

    async createClinicalNote(note: { patient_id: string; content: string; created_by?: string }) {
        const { data, error } = await supabase
            .from('clinical_notes')
            .insert([note])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Storage ---

    async uploadAvatar(file: File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return publicUrl;
    },

    async uploadPatientPhoto(patientId: string, file: File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${patientId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `patient-photos/${fileName}`;

        // Ensure we try to upload. If the bucket doesn't exist, this might fail, 
        // but typically one should set up 'patient-photos' bucket in Supabase dashboard.
        // Falls back to 'avatars' if strict separation isn't enforced, but better to use specific bucket.
        // For now, let's assume 'patient-photos' exists or use 'public' if generic.
        // Let's stick to 'patient-photos' as a dedicated bucket pattern.

        const { error: uploadError } = await supabase.storage
            .from('patient-photos')
            .upload(filePath, file);

        if (uploadError) {
            // Fallback to 'avatars' if 'patient-photos' not found/configured (common in dev)
            if (uploadError.message.includes('Bucket not found')) {
                const backupPath = `patient_uploads/${patientId}_${fileName}`;
                const { error: backupError } = await supabase.storage
                    .from('avatars') // reusing existing bucket
                    .upload(backupPath, file);

                if (backupError) throw backupError;

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(backupPath);
                return publicUrl;
            }
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('patient-photos')
            .getPublicUrl(filePath);

        return publicUrl;
    },

    // --- Logs ---

    async createLog(log: Omit<TreatmentLog, 'id' | 'created_at' | 'user_email'>) {
        const { data: { user } } = await supabase.auth.getUser();

        const dbLog = {
            treatment_id: log.treatment_id,
            action: log.action,
            description: log.description,
            user_id: user?.id,
            metadata: { ...log.metadata, user_email: user?.email }
        };

        const { data, error } = await supabase
            .from('treatment_logs')
            .insert([dbLog])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getTreatmentLogs(treatmentId: string) {
        const { data, error } = await supabase
            .from('treatment_logs')
            .select('*') // We can join with auth.users if we have access, otherwise we rely on user_id
            .eq('treatment_id', treatmentId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Se pudéssemos fazer join com users seria melhor, mas policies de auth.users costumam ser restritas.
        // O ideal seria ter uma tabela public.profiles.
        // Por enquanto, retornamos os logs como estão.
        return data as TreatmentLog[];
    }
};

// Helper to map DB treatment to Frontend type
const mapDbToTreatment = (dbT: any): PatientTreatment => {
    const stageData = dbT.stage_data || {};
    // Extract snapshot if exists, removes it from stageData to keep it clean for UI usage if needed, 
    // or keep it. Here we explicitly map it to 'scripts'.
    const scriptsSnapshot = stageData._scriptsSnapshot;

    return {
        id: dbT.id,
        patientId: dbT.patient_id,
        procedureId: dbT.procedure_id,
        procedureName: dbT.procedure_name,
        startedAt: dbT.started_at,
        status: dbT.status,
        tasksCompleted: dbT.tasks_completed,
        totalTasks: dbT.total_tasks,
        progress: dbT.progress,
        stageData: stageData,
        surveyStatus: dbT.survey_status as SurveyStatus,
        surveyData: dbT.survey_data || undefined,
        scripts: scriptsSnapshot // Popula o campo scripts no frontend
    };
};

// Helper function to map DB fields (snake_case) to Frontend fields (camelCase)
const mapDbToPatient = (dbPatient: any): Patient => ({
    id: dbPatient.id,
    name: dbPatient.name,
    phone: dbPatient.phone,
    email: dbPatient.email,
    dob: dbPatient.dob,
    cpf: dbPatient.cpf,
    procedures: dbPatient.procedures || [],
    procedureDate: dbPatient.procedure_date,
    lastVisit: dbPatient.last_visit,
    status: dbPatient.status,
    progress: dbPatient.progress || 0,
    tasksCompleted: dbPatient.tasks_completed || 0,
    totalTasks: dbPatient.total_tasks || 0,
    photos: dbPatient.photos || [],
    avatar: dbPatient.avatar,
});
