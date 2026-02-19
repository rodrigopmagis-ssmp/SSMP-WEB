import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ScheduleBlock {
    id: string;
    clinic_id: string;
    professional_id: string | null;
    date: string; // Format: "YYYY-MM-DD"
    start_time: string | null; // Format: "HH:MM:SS"
    end_time: string | null; // Format: "HH:MM:SS"
    is_clinic_wide: boolean;
    is_full_day: boolean;
    reason: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateScheduleBlockData {
    professional_id?: string | null;
    date: string;
    start_time?: string | null;
    end_time?: string | null;
    is_clinic_wide: boolean;
    is_full_day: boolean;
    reason?: string;
}

export const useScheduleBlocks = (clinicId: string | undefined) => {
    const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchScheduleBlocks = async (startDate?: string, endDate?: string) => {
        if (!clinicId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            let query = supabase
                .from('schedule_blocks')
                .select('*')
                .eq('clinic_id', clinicId);

            if (startDate) {
                query = query.gte('date', startDate);
            }

            if (endDate) {
                query = query.lte('date', endDate);
            }

            const { data, error: fetchError } = await query.order('date', { ascending: true });

            if (fetchError) throw fetchError;

            setScheduleBlocks(data || []);
        } catch (err: any) {
            console.error('Error fetching schedule blocks:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createScheduleBlock = async (blockData: CreateScheduleBlockData) => {
        if (!clinicId) return;

        try {
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();

            const { error: insertError } = await supabase
                .from('schedule_blocks')
                .insert({
                    clinic_id: clinicId,
                    professional_id: blockData.professional_id || null,
                    date: blockData.date,
                    start_time: blockData.start_time || null,
                    end_time: blockData.end_time || null,
                    is_clinic_wide: blockData.is_clinic_wide,
                    is_full_day: blockData.is_full_day,
                    reason: blockData.reason || null,
                    created_by: user?.id || null
                });

            if (insertError) throw insertError;

            // Refresh data
            await fetchScheduleBlocks();
        } catch (err: any) {
            console.error('Error creating schedule block:', err);
            setError(err.message);
            throw err;
        }
    };

    const updateScheduleBlock = async (id: string, blockData: Partial<CreateScheduleBlockData>) => {
        try {
            setError(null);

            const { error: updateError } = await supabase
                .from('schedule_blocks')
                .update({
                    ...blockData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // Refresh data
            await fetchScheduleBlocks();
        } catch (err: any) {
            console.error('Error updating schedule block:', err);
            setError(err.message);
            throw err;
        }
    };

    const deleteScheduleBlock = async (id: string) => {
        try {
            setError(null);

            const { error: deleteError } = await supabase
                .from('schedule_blocks')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Refresh data
            await fetchScheduleBlocks();
        } catch (err: any) {
            console.error('Error deleting schedule block:', err);
            setError(err.message);
            throw err;
        }
    };

    const getBlocksForDate = (date: Date): ScheduleBlock[] => {
        const dateStr = date.toISOString().split('T')[0];
        return scheduleBlocks.filter(block => block.date === dateStr);
    };

    const isTimeBlocked = (
        date: Date,
        time: string,
        professionalId?: string
    ): boolean => {
        const dateStr = date.toISOString().split('T')[0];
        const blocks = scheduleBlocks.filter(block => block.date === dateStr);

        return blocks.some(block => {
            // Check if it's a clinic-wide block
            if (block.is_clinic_wide) return true;

            // Check if it's for the specific professional
            if (professionalId && block.professional_id === professionalId) {
                // If full day, it's blocked
                if (block.is_full_day) return true;

                // Check if time is within block range
                if (block.start_time && block.end_time) {
                    return time >= block.start_time && time <= block.end_time;
                }
            }

            return false;
        });
    };

    useEffect(() => {
        fetchScheduleBlocks();
    }, [clinicId]);

    return {
        scheduleBlocks,
        loading,
        error,
        createScheduleBlock,
        updateScheduleBlock,
        deleteScheduleBlock,
        getBlocksForDate,
        isTimeBlocked,
        refetch: fetchScheduleBlocks
    };
};
