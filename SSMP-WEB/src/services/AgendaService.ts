import { supabase } from '../lib/supabase';

export interface Appointment {
    id: string;
    patient_id: string;
    professional_id: string | null;
    procedure_id?: string; // Added field
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    status: 'scheduled' | 'cancelled' | 'completed' | 'confirmed' | 'no_show' | 'rescheduled';
    type?: string;
    google_event_id?: string;
    sync_status?: 'synced' | 'error' | 'pending';
    created_at?: string;
    updated_at?: string;
    procedure?: {
        name: string;
    };
    patient?: {
        name: string;
    };
    professional?: {
        full_name: string;
    };
}

export interface CreateAppointmentDTO {
    patient_id: string;
    professional_id?: string;
    procedure_id?: string; // Added field
    title: string;
    description?: string;
    start_time: Date;
    end_time: Date;
    type?: string;
    status?: 'scheduled' | 'cancelled' | 'completed' | 'confirmed' | 'no_show' | 'rescheduled';
}

export interface UpdateAppointmentDTO {
    patient_id?: string;
    professional_id?: string;
    procedure_id?: string; // Added field
    title?: string;
    description?: string;
    start_time?: Date;
    end_time?: Date;
    status?: 'scheduled' | 'cancelled' | 'completed' | 'confirmed' | 'no_show' | 'rescheduled';
    type?: string;
}

export const AgendaService = {
    /**
     * Fetches appointments within a date range, optionally filtered by professional.
     */
    async getAppointments(start: Date, end: Date, professionalId?: string) {
        let query = supabase
            .from('appointments')
            .select(`
        *,
        patient:patients(name),
        professional:profiles(full_name),
        procedure:procedures(name)
      `)
            .gte('start_time', start.toISOString())
            .lte('end_time', end.toISOString());

        if (professionalId && professionalId !== 'all') {
            query = query.eq('professional_id', professionalId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching appointments:', error);
            throw error;
        }

        return data as unknown as Appointment[];
    },

    /**
     * Fetches appointments for a specific patient.
     */
    async getAppointmentsByPatient(patientId: string) {
        const { data, error } = await supabase
            .from('appointments')
            .select(`
        *,
        professional:profiles(full_name)
      `)
            .eq('patient_id', patientId)
            .order('start_time', { ascending: true }); // Future: separate active vs history?

        if (error) {
            console.error('Error fetching patient appointments:', error);
            throw error;
        }

        return data as Appointment[];
    },

    /**
     * Creates a new appointment.
     */
    async createAppointment(appointment: CreateAppointmentDTO) {
        const { data, error } = await supabase
            .from('appointments')
            .insert({
                ...appointment,
                start_time: appointment.start_time.toISOString(),
                end_time: appointment.end_time.toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating appointment:', error);
            throw new Error(error.message);
        }

        return data as Appointment;
    },

    /**
     * Updates an existing appointment.
     */
    async updateAppointment(id: string, updates: UpdateAppointmentDTO) {
        const payload: any = { ...updates };
        if (updates.start_time) payload.start_time = updates.start_time.toISOString();
        if (updates.end_time) payload.end_time = updates.end_time.toISOString();

        const { data, error } = await supabase
            .from('appointments')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating appointment:', error);
            throw error;
        }

        return data as Appointment;
    },

    /**
     * Deletes (cancels) an appointment.
     * Note: Usually we verify status first, but this is a hard delete or status update.
     * If strictly cancelling, consider using updateAppointment with status='cancelled'.
     */
    async deleteAppointment(id: string) {
        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting appointment:', error);
            throw error;
        }
    },

    /**
     * Reschedules an appointment: updates the old one to 'rescheduled' and creates a new one.
     */
    async rescheduleAppointment(oldAppointmentId: string, newAppointment: CreateAppointmentDTO) {
        // 1. Update old appointment status to 'rescheduled'
        const { error: updateError } = await supabase
            .from('appointments')
            .update({ status: 'rescheduled' })
            .eq('id', oldAppointmentId);

        if (updateError) {
            console.error('Error updating old appointment status:', updateError);
            if (updateError.message?.includes('violates check constraint')) {
                throw new Error('Erro de validação: O status "Reagendado" não é permitido pelo banco de dados. Execute a migração necessária.');
            }
            throw new Error(`Erro ao atualizar status: ${updateError.message}`);
        }

        // 2. Create new appointment
        return await this.createAppointment({
            ...newAppointment,
            status: 'scheduled',
            title: newAppointment.title || 'Reagendamento', // Ensure title indicates rescheduling if not provided
        });
    },

    /**
     * Fetches professionals (profiles with specific roles) for the filter.
     */
    async getProfessionals() {
        // Select all fields so it matches UserProfile type
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('role', ['doctor', 'master', 'admin', 'biomedico']) // Adjust roles as needed
            .order('full_name');

        if (error) {
            console.error('Error fetching professionals:', error);
            throw error;
        }

        return data;
    },

    /**
     * Checks for overlapping appointments for a professional or patient.
     * Uses the standard overlap formula: start < other_end AND end > other_start.
     * @param startTime - Start of the new/edited appointment
     * @param endTime - End of the new/edited appointment
     * @param professionalId - Professional to check
     * @param patientId - Patient to check
     * @param excludeAppointmentId - ID of the current appointment to exclude (edit mode)
     */
    async checkAvailability(
        startTime: Date,
        endTime: Date,
        professionalId: string,
        patientId: string,
        excludeAppointmentId?: string
    ): Promise<{ professionalConflict: Appointment | null; patientConflict: Appointment | null }> {
        const startISO = startTime.toISOString();
        const endISO = endTime.toISOString();
        const activeStatuses = ['scheduled', 'confirmed', 'completed'];

        // Build base query for overlapping time range
        const buildQuery = (filterField: string, filterValue: string) => {
            let q = supabase
                .from('appointments')
                .select('id, title, start_time, end_time, status, patient_id, professional_id, patient:patients(name), professional:profiles(full_name)')
                .eq(filterField, filterValue)
                .in('status', activeStatuses)
                .lt('start_time', endISO)   // other starts before our end
                .gt('end_time', startISO);  // other ends after our start

            if (excludeAppointmentId) {
                q = q.neq('id', excludeAppointmentId);
            }
            return q.limit(1);
        };

        const [profResult, patientResult] = await Promise.all([
            buildQuery('professional_id', professionalId),
            buildQuery('patient_id', patientId),
        ]);

        if (profResult.error) throw profResult.error;
        if (patientResult.error) throw patientResult.error;

        return {
            professionalConflict: (profResult.data?.[0] ?? null) as unknown as Appointment | null,
            patientConflict: (patientResult.data?.[0] ?? null) as unknown as Appointment | null,
        };
    }
};
