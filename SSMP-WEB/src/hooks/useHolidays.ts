import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Holiday {
    id: string;
    clinic_id: string;
    date: string; // Format: "YYYY-MM-DD"
    description: string;
    created_at: string;
}

export const useHolidays = (clinicId: string | undefined) => {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHolidays = async () => {
        if (!clinicId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('clinic_holidays')
                .select('*')
                .eq('clinic_id', clinicId)
                .order('date', { ascending: true });

            if (fetchError) throw fetchError;

            setHolidays(data || []);
        } catch (err: any) {
            console.error('Error fetching holidays:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addHoliday = async (date: string, description: string) => {
        if (!clinicId) return;

        try {
            setError(null);

            const { error: insertError } = await supabase
                .from('clinic_holidays')
                .insert({
                    clinic_id: clinicId,
                    date,
                    description
                });

            if (insertError) throw insertError;

            // Refresh data
            await fetchHolidays();
        } catch (err: any) {
            console.error('Error adding holiday:', err);
            setError(err.message);
            throw err;
        }
    };

    const deleteHoliday = async (id: string) => {
        try {
            setError(null);

            const { error: deleteError } = await supabase
                .from('clinic_holidays')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Refresh data
            await fetchHolidays();
        } catch (err: any) {
            console.error('Error deleting holiday:', err);
            setError(err.message);
            throw err;
        }
    };

    const isHoliday = (date: Date): boolean => {
        const dateStr = date.toISOString().split('T')[0];
        return holidays.some(h => h.date === dateStr);
    };

    useEffect(() => {
        fetchHolidays();
    }, [clinicId]);

    return {
        holidays,
        loading,
        error,
        addHoliday,
        deleteHoliday,
        isHoliday,
        refetch: fetchHolidays
    };
};
