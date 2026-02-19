import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface TimeRange {
    start: string; // Format: "HH:MM"
    end: string;   // Format: "HH:MM"
}

export interface BusinessHours {
    id: string;
    clinic_id: string;
    day_of_week: number; // 0=Domingo, 1=Segunda, ..., 6=Sábado
    is_active: boolean;
    time_ranges: TimeRange[];
    created_at: string;
    updated_at: string;
}

export const useBusinessHours = (clinicId: string | undefined) => {
    const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBusinessHours = async () => {
        if (!clinicId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('clinic_business_hours')
                .select('*')
                .eq('clinic_id', clinicId)
                .order('day_of_week', { ascending: true });

            if (fetchError) throw fetchError;

            setBusinessHours(data || []);
        } catch (err: any) {
            console.error('Error fetching business hours:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateBusinessHours = async (
        dayOfWeek: number,
        timeRanges: TimeRange[],
        isActive: boolean
    ) => {
        if (!clinicId) return;

        try {
            setError(null);

            // Check if record exists
            const existing = businessHours.find(bh => bh.day_of_week === dayOfWeek);

            if (existing) {
                // Update existing record
                const { error: updateError } = await supabase
                    .from('clinic_business_hours')
                    .update({
                        time_ranges: timeRanges,
                        is_active: isActive
                    })
                    .eq('id', existing.id);

                if (updateError) throw updateError;
            } else {
                // Insert new record
                const { error: insertError } = await supabase
                    .from('clinic_business_hours')
                    .insert({
                        clinic_id: clinicId,
                        day_of_week: dayOfWeek,
                        time_ranges: timeRanges,
                        is_active: isActive
                    });

                if (insertError) throw insertError;
            }

            // Refresh data
            await fetchBusinessHours();
        } catch (err: any) {
            console.error('Error updating business hours:', err);
            setError(err.message);
            throw err;
        }
    };

    const getBusinessHoursForDay = useCallback((dayOfWeek: number): BusinessHours | null => {
        return businessHours.find(bh => bh.day_of_week === dayOfWeek) || null;
    }, [businessHours]);

    const getBusinessHoursForDate = useCallback((date: Date): TimeRange[] => {
        // If NO business hours are configured (empty array), use default: Mon-Fri 09:00-18:00
        if (businessHours.length === 0 && !loading) {
            const day = date.getDay();
            // 0=Sunday, 6=Saturday. Open on Weekdays (1-5)
            if (day >= 1 && day <= 5) {
                return [{ start: '09:00', end: '18:00' }];
            }
            return [];
        }

        const dayOfWeek = date.getDay();
        const hours = getBusinessHoursForDay(dayOfWeek);

        if (!hours || !hours.is_active) return [];
        return hours.time_ranges;
    }, [getBusinessHoursForDay, businessHours, loading]);

    useEffect(() => {
        fetchBusinessHours();
    }, [clinicId]);

    return {
        businessHours,
        loading,
        error,
        updateBusinessHours,
        getBusinessHoursForDay,
        getBusinessHoursForDate,
        refetch: fetchBusinessHours
    };
};
