import { useState, useEffect, useRef } from 'react';
import { supabaseService } from '../services/supabaseService';
import { Consultation } from '../../types';

export const useConsultationStatus = (consultationId: string | null) => {
    const [consultation, setConsultation] = useState<Consultation | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    const fetchConsultation = async () => {
        if (!consultationId) return;
        try {
            const data = await supabaseService.getConsultationById(consultationId);
            setConsultation(data);
            return data;
        } catch (err) {
            console.error('Error fetching consultation:', err);
            setError(err as Error);
            return null;
        }
    };

    useEffect(() => {
        if (!consultationId) {
            setConsultation(null);
            return;
        }

        setIsLoading(true);
        fetchConsultation().finally(() => setIsLoading(false));

        // Start polling logic
        const startPolling = () => {
            // Clear existing
            if (pollInterval.current) clearInterval(pollInterval.current);

            pollInterval.current = setInterval(async () => {
                const data = await fetchConsultation();

                // Stop polling if processing is done
                if (data && (data.status === 'review_needed' || data.status === 'signed')) {
                    if (pollInterval.current) clearInterval(pollInterval.current);
                }
            }, 3000); // 3 seconds
        };

        startPolling();

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [consultationId]);

    // Check if we should re-enable polling if status changed externally to 'processing'
    // But for now, simple mount/unmount and id change logic is enough.
    // If the user manually changes status to 'processing' (e.g. re-run), this hook might need a trigger.
    // We can rely on consultationId change or just let it be.

    return { consultation, isLoading, error };
};
