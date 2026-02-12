import { supabase } from '../lib/supabase';
import { Patient, Procedure, PatientTreatment, SurveyStatus, TreatmentLog, UserProfile, Lead, OmbudsmanComplaint, OmbudsmanTimeline, ComplaintSeverity, OmbudsmanContact, ResponseStatus, Consultation, PatientMemory, Budget, BudgetItem } from '../../types';
import { PROCEDURES as INITIAL_PROCEDURES } from '../../constants';

export const supabaseService = {
    // --- Helper ---
    async _getClinicId() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        return profile?.clinic_id;
    },

    // --- Patients ---

    async getPatients() {
        const { data, error } = await supabase
            .from('patients')
            .select(`
                *,
                patient_treatments (
                    procedure_name,
                    status
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch calibration settings
        const settings = await this.getCRMSettings();

        return (data || []).map(p => {
            const treatments = p.patient_treatments || [];
            // Get unique procedure names from active/all treatments
            const procedureNames = Array.from(new Set(treatments.map((t: any) => t.procedure_name).filter(Boolean)));

            const patientWithProcedures = {
                ...p,
                procedures: procedureNames
            };

            return mapDbToPatient(patientWithProcedures);
        });
    },

    async getPatient(id: string) {
        const { data, error } = await supabase
            .from('patients')
            .select(`
                *,
                patient_treatments (
                    procedure_name,
                    status
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        const treatments = data.patient_treatments || [];
        const procedureNames = Array.from(new Set(treatments.map((t: any) => t.procedure_name).filter(Boolean)));

        const patientWithProcedures = {
            ...data,
            procedures: procedureNames
        };

        return mapDbToPatient(patientWithProcedures);
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
            // procedures: patient.procedures, // Deprecated - derived from treatments
            procedure_date: patient.procedureDate,
            last_visit: patient.lastVisit,
            status: patient.status,
            progress: patient.progress,
            tasks_completed: patient.tasksCompleted,
            total_tasks: patient.totalTasks,
            // photos: patient.photos, // Deprecated - stored in patient_photos
            avatar: patient.avatar,
            user_id: user.id,
            clinic_id: await this._getClinicId(),
            gender: patient.gender,
            marital_status: patient.maritalStatus,
            profession: patient.profession
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
        // if (updates.procedures !== undefined) dbUpdates.procedures = updates.procedures; // Deprecated
        if (updates.procedureDate !== undefined) dbUpdates.procedure_date = updates.procedureDate;
        if (updates.lastVisit !== undefined) dbUpdates.last_visit = updates.lastVisit;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
        if (updates.tasksCompleted !== undefined) dbUpdates.tasks_completed = updates.tasksCompleted;
        if (updates.totalTasks !== undefined) dbUpdates.total_tasks = updates.totalTasks;
        // if (updates.photos !== undefined) dbUpdates.photos = updates.photos; // Deprecated
        if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
        if (updates.survey !== undefined) dbUpdates.survey = updates.survey;
        if (updates.stageData !== undefined) dbUpdates.stage_data = updates.stageData;

        if (updates.stageData !== undefined) dbUpdates.stage_data = updates.stageData;

        if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
        if (updates.maritalStatus !== undefined) dbUpdates.marital_status = updates.maritalStatus;
        if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
        if (updates.maritalStatus !== undefined) dbUpdates.marital_status = updates.maritalStatus;
        if (updates.maritalStatus !== undefined) dbUpdates.marital_status = updates.maritalStatus;
        if (updates.profession !== undefined) dbUpdates.profession = updates.profession;
        if (updates.address !== undefined) dbUpdates.address = updates.address;

        if (updates.rg !== undefined) dbUpdates.rg = updates.rg;
        if (updates.cnpj !== undefined) dbUpdates.cnpj = updates.cnpj;
        if (updates.race !== undefined) dbUpdates.race = updates.race;
        if (updates.origin !== undefined) dbUpdates.origin = updates.origin;
        if (updates.healthInsurance !== undefined) dbUpdates.health_insurance = updates.healthInsurance;

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
            .select('*, budget_description')
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

        const clinicId = await this._getClinicId();

        const proceduresToInsert = INITIAL_PROCEDURES.map(p => ({
            name: p.name,
            icon: p.icon,
            description: p.description,
            scripts: p.scripts,
            user_id: user.id,
            clinic_id: clinicId
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
            clinic_id: await this._getClinicId(),
            is_active: true,
            category_id: procedure.category_id,
            price: procedure.price,
            promotional_price: procedure.promotional_price,
            use_in_budget: procedure.use_in_budget,
            budget_description: procedure.budget_description,
            allows_sessions: procedure.allows_sessions
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
            category_id: procedure.category_id,
            price: procedure.price,
            promotional_price: procedure.promotional_price,
            use_in_budget: procedure.use_in_budget,
            budget_description: procedure.budget_description,
            allows_sessions: procedure.allows_sessions
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

    // --- Procedure Categories ---

    async getProcedureCategories() {
        const clinicId = await this._getClinicId();
        const { data, error } = await supabase
            .from('procedure_categories')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('name', { ascending: true });

        if (error) throw error;
        return data;
    },

    async createProcedureCategory(name: string) {
        const clinicId = await this._getClinicId();
        const { data, error } = await supabase
            .from('procedure_categories')
            .insert([{ name, clinic_id: clinicId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteProcedureCategory(id: string) {
        const { error } = await supabase
            .from('procedure_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
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

        const clinicId = await this._getClinicId();

        const dbTreatment = {
            patient_id: treatment.patientId,
            procedure_id: treatment.procedureId,
            procedure_name: treatment.procedureName,
            clinic_id: clinicId,
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

    // --- Patient Photos (New Table) ---

    async getPatientPhotos(patientId: string) {
        const { data, error } = await supabase
            .from('patient_photos')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map((p: any) => ({
            id: p.id,
            patientId: p.patient_id,
            treatmentId: p.treatment_id,
            stageId: p.stage_id,
            photoUrl: p.photo_url,
            createdAt: p.created_at,
            metadata: p.metadata
        }));
    },

    async addPatientPhoto(patientId: string, url: string, treatmentId?: string, stageId?: string) {
        const { data, error } = await supabase
            .from('patient_photos')
            .insert([{
                patient_id: patientId,
                photo_url: url,
                treatment_id: treatmentId,
                stage_id: stageId
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deletePatientPhoto(photoId: string) {
        const { error } = await supabase
            .from('patient_photos')
            .delete()
            .eq('id', photoId);
        if (error) throw error;
        return true;
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
    },

    // --- Clinic ---

    async getClinic(userId: string) {
        const { data, error } = await supabase
            .from('clinics')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return data || null;
    },

    async upsertClinic(clinicData: any) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('clinics')
            .upsert({
                ...clinicData,
                user_id: user.id,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;

        // Sync clinic_id to profile
        if (data?.id) {
            await supabase
                .from('profiles')
                .update({ clinic_id: data.id })
                .eq('id', user.id);
        }

        return data;
    },

    async uploadClinicLogo(userId: string, file: File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/logo.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('clinic-logos')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('clinic-logos')
            .getPublicUrl(filePath);

        return publicUrl;
    },

    async getAllClinics() {
        const { data, error } = await supabase
            .from('clinics')
            .select('id, fantasy_name, business_name')
            .order('fantasy_name', { ascending: true });

        if (error) throw error;
        return data.map((c: any) => ({
            id: c.id,
            name: c.fantasy_name || c.business_name || 'Clínica sem nome'
        }));
    },

    // --- User Profiles ---

    async getUserProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            // If profile doesn't exist yet (race condition), return pending mock or null
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    },

    async getAllProfiles() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async updateProfileStatus(userId: string, status: 'approved' | 'rejected', role?: string, clinicId?: string) {
        const updates: any = { status };
        if (role) updates.role = role;
        if (clinicId) updates.clinic_id = clinicId;

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Leads ---

    async getCRMSettings(key: string = 'lead_scoring') {
        const { data, error } = await supabase
            .from('crm_settings')
            .select('value')
            .eq('setting_key', key)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching CRM settings:', error);
            return null;
        }
        return data?.value || { frio_max: 50, morno_max: 75, quente_max: 90 }; // Default fallback
    },

    async updateCRMSettings(key: string, value: any) {
        const { data, error } = await supabase
            .from('crm_settings')
            .upsert({ setting_key: key, value, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' })
            .select()
            .single();

        if (error) {
            console.error('Error updating CRM settings:', error);
            throw error;
        }
        return data;
    },

    async getQuizConfig() {
        // Try to fetch quiz config from DB
        const { data, error } = await supabase
            .from('quiz_config')
            .select('*')
            .single();

        if (error) {
            console.error('Error fetching quiz config:', error);
            // If profile doesn't exist yet (race condition), return pending mock or null
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        console.log('Fetched Quiz Config:', data);
        return data;
    },

    async saveQuizConfig(questions: any[], finalScreen?: any) {
        // Fetch existing config to determine if we update or insert
        const current = await this.getQuizConfig();

        const payload: any = {
            questions: questions,
            final_screen: finalScreen,
            updated_at: new Date().toISOString()
        };

        let result;
        let error;

        if (current && current.id) {
            // Update existing
            const response = await supabase
                .from('quiz_config')
                .update(payload)
                .eq('id', current.id)
                .select()
                .single();
            result = response.data;
            error = response.error;
        } else {
            // Insert new (let DB generate UUID)
            const response = await supabase
                .from('quiz_config')
                .insert([payload])
                .select()
                .single();
            result = response.data;
            error = response.error;
        }

        if (error) {
            console.error('Error saving quiz config:', error);
            throw error;
        }
        return result;
    },

    async getLeads() {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch settings for calibration
        const settings = await this.getCRMSettings();

        return (data || []).map(lead => mapDbToLead(lead, settings));
    },

    async getLeadById(id: string) {
        // Fetch specific lead
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Fetch calibration settings to map status correctly
        const settings = await this.getCRMSettings();

        return mapDbToLead(data, settings);
    },

    async updateLead(id: string, updates: Partial<Lead>) {
        // If sorting status, map 'Frio' back to 'Cold' if necessary, or just save as is.
        // Assuming DB accepts the PT values since mapDbToLead handles fallback.

        const { data, error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async createLead(leadData: Partial<Lead>) {
        // Use explicit clinic_id if provided, otherwise fallback to user's default clinic
        const clinicId = leadData.clinic_id || await this._getClinicId();

        const dbLead = {
            ...leadData,
            clinic_id: clinicId,
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('leads')
            .insert([dbLead])
            .select()
            .single();

        if (error) throw error;

        const settings = await this.getCRMSettings();
        return mapDbToLead(data, settings);
    },

    // --- Patient Tags ---

    async getTags() {
        // First try to select with clinic_id if we have one, otherwise fallback or just select all for now
        // Assuming RLS handles visibility, but we can filter by clinic_id explicitly
        const clinicId = await this._getClinicId();
        let query = supabase
            .from('patient_tags')
            .select('*')
            .order('name', { ascending: true });

        if (clinicId) {
            query = query.eq('clinic_id', clinicId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async createTag(name: string, color: string) {
        const clinicId = await this._getClinicId();
        const { data, error } = await supabase
            .from('patient_tags')
            .insert([{ name, color, clinic_id: clinicId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteTag(id: string) {
        const { error } = await supabase
            .from('patient_tags')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    async assignTag(patientId: string, tagId: string, metadata: any = {}) {
        const { data, error } = await supabase
            .from('patient_tag_assignments')
            .insert([{ patient_id: patientId, tag_id: tagId, metadata }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') return null; // Already assigned
            throw error;
        }
        return data;
    },

    async removeTag(patientId: string, tagId: string) {
        const { error } = await supabase
            .from('patient_tag_assignments')
            .delete()
            .match({ patient_id: patientId, tag_id: tagId });

        if (error) throw error;
        return true;
    },

    async getPatientTags(patientId: string) {
        const { data, error } = await supabase
            .from('patient_tag_assignments')
            .select(`
                id,
                tag_id,
                metadata,
                patient_tags (
                    id,
                    name,
                    color
                )
            `)
            .eq('patient_id', patientId);

        if (error) throw error;
        // Merge assignment metadata into the tag object for easier frontend usage
        return data.map((item: any) => ({
            ...item.patient_tags,
            metadata: item.metadata,
            assignmentId: item.id
        }));
    },
    async updateLeadProtocol(leadId: string, updates: { protocol_data?: any, procedure_id?: string }) {
        const { error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', leadId);

        if (error) throw error;
    },

    // --- Ombudsman ---

    async createComplaint(complaint: Partial<OmbudsmanComplaint>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const clinicId = await this._getClinicId();

        // Calculate SLA deadline
        const slaDeadline = this._calculateSLADeadline(complaint.severity || 'baixa');
        const slaDays = {
            'critica': 1,
            'alta': 1,
            'media': 2,
            'baixa': 3
        }[complaint.severity || 'baixa'];

        const dbComplaint = {
            ...complaint,
            clinic_id: clinicId,
            created_by: user.id,
            sla_deadline: slaDeadline.toISOString(),
            sla_status: 'on_time',
            sla_days: slaDays
        };

        const { data, error } = await supabase
            .from('ombudsman_complaints')
            .insert([dbComplaint])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getComplaints() {
        const clinicId = await this._getClinicId();
        const { data, error } = await supabase
            .from('ombudsman_complaints')
            .select(`
                *,
                patient:patients!patient_id(*)
            `)
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as OmbudsmanComplaint[];
    },

    async getComplaintById(id: string) {
        const { data, error } = await supabase
            .from('ombudsman_complaints')
            .select(`
                *,
                patient:patients!patient_id(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as OmbudsmanComplaint;
    },

    async hasOpenComplaints(patientId: string) {
        const { data, error } = await supabase
            .from('ombudsman_complaints')
            .select('id')
            .eq('patient_id', patientId)
            .neq('status', 'encerrada')
            .limit(1);

        if (error) {
            console.error('Error checking open complaints:', error);
            return false;
        }
        return (data || []).length > 0;
    },

    async updateComplaint(id: string, updates: Partial<OmbudsmanComplaint>) {
        const { data, error } = await supabase
            .from('ombudsman_complaints')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async closeComplaint(
        complaintId: string,
        resolutionStatus: string,
        resolutionReason: string,
        userId: string
    ) {
        // Validar se há pelo menos 1 contato registrado
        const { data: contacts, error: contactsError } = await supabase
            .from('ombudsman_contacts')
            .select('id')
            .eq('complaint_id', complaintId)
            .limit(1);

        if (contactsError) throw contactsError;

        if (!contacts || contacts.length === 0) {
            throw new Error('É necessário registrar pelo menos 1 contato antes de encerrar a reclamação.');
        }

        // Encerrar reclamação
        const { data, error } = await supabase
            .from('ombudsman_complaints')
            .update({
                status: 'encerrada',
                resolution_status: resolutionStatus,
                resolution_reason: resolutionReason,
                resolved_at: new Date().toISOString(),
                resolved_by: userId
            })
            .eq('id', complaintId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getComplaintTimeline(complaintId: string) {
        const { data, error } = await supabase
            .from('ombudsman_timeline')
            .select('*')
            .eq('complaint_id', complaintId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as OmbudsmanTimeline[];
    },

    async addComplaintEvent(event: Partial<OmbudsmanTimeline>) {
        const { data: { user } } = await supabase.auth.getUser();

        const dbEvent = {
            ...event,
            created_by: user?.id
        };

        const { data, error } = await supabase
            .from('ombudsman_timeline')
            .insert([dbEvent])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getEmployees() {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, role, email')
            .in('role', ['admin', 'master', 'receptionist', 'doctor', 'manager'])
            .order('full_name');

        if (error) {
            console.error('Error fetching employees:', error);
            return [];
        }
        return data || [];
    },

    // SLA Helper Function
    _calculateSLADeadline(severity: ComplaintSeverity, createdAt: Date = new Date()): Date {
        const businessDays: Record<ComplaintSeverity, number> = {
            'critica': 1,
            'alta': 1,
            'media': 2,
            'baixa': 3
        };

        const days = businessDays[severity] || 3;
        let deadline = new Date(createdAt);
        let addedDays = 0;

        while (addedDays < days) {
            deadline.setDate(deadline.getDate() + 1);
            const dayOfWeek = deadline.getDay();
            // 0 = Domingo, 6 = Sábado
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                addedDays++;
            }
        }

        // Set to end of business day (18:00)
        deadline.setHours(18, 0, 0, 0);
        return deadline;
    },

    // Contact Methods
    async getComplaintContacts(complaintId: string) {
        const { data, error } = await supabase
            .from('ombudsman_contacts')
            .select('*')
            .eq('complaint_id', complaintId)
            .order('contacted_at', { ascending: false });

        if (error) {
            console.error('Error fetching contacts:', error);
            return [];
        }
        return data || [];
    },

    async addContact(contact: Partial<OmbudsmanContact>) {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('ombudsman_contacts')
            .insert({
                ...contact,
                created_by: user?.id,
                response_status: contact.response_status || 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateContactResponse(contactId: string, response: string, responseStatus: ResponseStatus = 'responded') {
        const { data, error } = await supabase
            .from('ombudsman_contacts')
            .update({
                response,
                responded_at: new Date().toISOString(),
                response_status: responseStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', contactId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },



    // --- Budgets ---

    async getBudgets() {
        const { data, error } = await supabase
            .from('budgets')
            .select(`
                *,
                patient:patients(id, name, avatar),
                items:budget_items(*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as any[];
    },

    async getBudgetById(id: string) {
        const { data, error } = await supabase
            .from('budgets')
            .select(`
                *,
                patient:patients(id, name, cpf, phone, email, address),
                clinic:clinics(*),
                items:budget_items(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async createBudget(budget: Partial<Budget>, items: Partial<BudgetItem>[]) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const clinicId = await this._getClinicId();

        // 1. Create Budget
        const dbBudget = {
            patient_id: budget.patient_id,
            clinic_id: clinicId,
            status: budget.status || 'draft',
            payment_method: budget.payment_method,
            installments: budget.installments,
            card_fee_percent: budget.card_fee_percent,
            subtotal: budget.subtotal,
            total_with_fee: budget.total_with_fee,
            valid_until: budget.valid_until,
            payment_methods: budget.payment_methods
        };

        const { data: budgetData, error: budgetError } = await supabase
            .from('budgets')
            .insert([dbBudget])
            .select()
            .single();

        if (budgetError) throw budgetError;

        // 2. Create Items
        if (items && items.length > 0) {
            const dbItems = items.map(item => ({
                budget_id: budgetData.id,
                procedure_id: item.procedure_id,
                procedure_name_snapshot: item.procedure_name_snapshot,
                description_snapshot: item.description_snapshot,
                unit_price: item.unit_price,
                sessions: item.sessions,
                total_price: item.total_price
            }));

            const { error: itemsError } = await supabase
                .from('budget_items')
                .insert(dbItems);

            if (itemsError) {
                // Determine if we should delete the budget if items fail, 
                // but for now let's just throw
                throw itemsError;
            }
        }

        return budgetData;
    },

    async updateBudget(id: string, updates: Partial<Budget>, newItems?: Partial<BudgetItem>[]) {
        // 1. Update Budget Fields
        const { data, error } = await supabase
            .from('budgets')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // 2. Update Items (Strategy: Delete all and recreate if newItems is provided)
        // This is simpler for "snapshot" style editing where we save the whole state.
        if (newItems) {
            // Delete existing
            await supabase.from('budget_items').delete().eq('budget_id', id);

            // Insert new
            const dbItems = newItems.map(item => ({
                budget_id: id,
                procedure_id: item.procedure_id,
                procedure_name_snapshot: item.procedure_name_snapshot,
                description_snapshot: item.description_snapshot,
                unit_price: item.unit_price,
                sessions: item.sessions,
                total_price: item.total_price
            }));

            if (dbItems.length > 0) {
                const { error: itemsError } = await supabase
                    .from('budget_items')
                    .insert(dbItems);

                if (itemsError) throw itemsError;
            }
        }

        return data;
    },

    async deleteBudget(id: string) {
        const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // --- AI Clinical Copilot ---

    async createConsultation(consultation: Partial<Consultation>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Ensure doctor_id is set to current user if not provided
        const dbConsultation = {
            patient_id: consultation.patientId,
            doctor_id: consultation.doctorId || user.id,
            audio_path: consultation.audioPath,
            status: consultation.status || 'draft',
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('consultations')
            .insert([dbConsultation])
            .select()
            .single();

        if (error) throw error;

        return {
            ...data,
            patientId: data.patient_id,
            doctorId: data.doctor_id,
            audioPath: data.audio_path,
            rawTranscript: data.raw_transcript,
            cleanTranscript: data.clean_transcript,
            aiProntuario: data.ai_prontuario,
            aiResumo: data.ai_resumo,
            createdAt: data.created_at
        } as Consultation;
    },

    async getConsultationById(id: string) {
        const { data, error } = await supabase
            .from('consultations')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Parse ai_prontuario if it's a string
        let aiProntuario = data.ai_prontuario;
        if (typeof aiProntuario === 'string') {
            try {
                aiProntuario = JSON.parse(aiProntuario);
            } catch (e) {
                console.error('Failed to parse ai_prontuario:', e);
                aiProntuario = null;
            }
        }

        return {
            id: data.id,
            patientId: data.patient_id,
            doctorId: data.doctor_id,
            audioPath: data.audio_path,
            rawTranscript: data.raw_transcript,
            cleanTranscript: data.clean_transcript,
            aiProntuario: aiProntuario,
            aiResumo: data.ai_resumo,
            status: data.status,
            metadata: data.metadata,
            createdAt: data.created_at
        } as Consultation;
    },

    async updateConsultation(id: string, updates: Partial<Consultation>) {
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.rawTranscript) dbUpdates.raw_transcript = updates.rawTranscript;
        if (updates.cleanTranscript) dbUpdates.clean_transcript = updates.cleanTranscript;
        if (updates.aiProntuario) dbUpdates.ai_prontuario = updates.aiProntuario;
        if (updates.aiResumo) dbUpdates.ai_resumo = updates.aiResumo;
        if (updates.audioPath) dbUpdates.audio_path = updates.audioPath;
        if (updates.metadata) dbUpdates.metadata = updates.metadata;

        dbUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('consultations')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            ...data,
            patientId: data.patient_id,
            doctorId: data.doctor_id,
            audioPath: data.audio_path,
            rawTranscript: data.raw_transcript,
            cleanTranscript: data.clean_transcript,
            aiProntuario: data.ai_prontuario,
            aiResumo: data.ai_resumo,
            createdAt: data.created_at
        } as Consultation;
    },

    async getPatientConsultations(patientId: string) {
        const { data, error } = await supabase
            .from('consultations')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((c: any) => ({
            id: c.id,
            patientId: c.patient_id,
            doctorId: c.doctor_id,
            audioPath: c.audio_path,
            rawTranscript: c.raw_transcript,
            cleanTranscript: c.clean_transcript,
            aiProntuario: c.ai_prontuario,
            aiResumo: c.ai_resumo,
            status: c.status,
            metadata: c.metadata,
            createdAt: c.created_at
        })) as Consultation[];
    },

    async uploadConsultationAudio(patientId: string, file: Blob) {
        const fileExt = 'webm'; // Assuming webm from MediaRecorder
        const fileName = `${patientId}/${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
            .from('secure-consultations')
            .upload(filePath, file, {
                contentType: 'audio/webm',
                upsert: true
            });

        if (uploadError) throw uploadError;

        return filePath;
    },

    async getPatientMemories(patientId: string) {
        const { data, error } = await supabase
            .from('patient_memories')
            .select('*')
            .eq('patient_id', patientId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((m: any) => ({
            id: m.id,
            patientId: m.patient_id,
            type: m.type,
            description: m.description,
            suggestion: m.suggestion,
            isActive: m.is_active,
            sourceConsultationId: m.source_consultation_id,
            createdAt: m.created_at
        })) as PatientMemory[];
    },

    async triggerCopilotProcessing(consultationId: string, audioPath: string) {
        console.log('Triggering n8n processing for:', consultationId, audioPath);

        // URL do Webhook do n8n (Production vs Dev)
        // Idealmente isso estaria em variáveis de ambiente (VITE_N8N_WEBHOOK_URL)
        const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
        const apiKey = import.meta.env.VITE_N8N_API_KEY || 'aesthetic-secret-key-123';

        if (!webhookUrl || webhookUrl.includes('seu-n8n-instance')) {
            console.warn('⚠️ N8N Webhook URL not configured or is placeholder. AI processing will be skipped.');
            console.warn('Please configure VITE_N8N_WEBHOOK_URL in your .env file.');
            return false;
        }

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    consultationId,
                    audio_path: audioPath
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Log detailed error but don't crash the app
                console.error(`❌ n8n Error (${response.status}): ${errorText}`);
                throw new Error(`n8n responded with ${response.status}: ${errorText}`);
            }

            console.log('✅ n8n triggered successfully');
            return true;
        } catch (error) {
            console.error('Failed to trigger n8n processing:', error);
            // Re-throw to let the UI know, but the UI now handles this gracefully
            throw error;
        }
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
    // photos: dbPatient.photos || [], // Deprecated
    avatar: dbPatient.avatar,
});

const mapDbToLead = (dbLead: any, settings?: any): Lead => {
    let status = dbLead.kanban_status === 'Cold' ? 'Frio' : (dbLead.kanban_status || 'Frio');

    return {
        ...dbLead,
        concerns: typeof dbLead.concerns === 'string' ? JSON.parse(dbLead.concerns) : (dbLead.concerns || []),
        availability: typeof dbLead.availability === 'string' ? JSON.parse(dbLead.availability) : (dbLead.availability || []),
        ai_tags: typeof dbLead.ai_tags === 'string' ? JSON.parse(dbLead.ai_tags) : (dbLead.ai_tags || []),
        kanban_status: status
    };
};
