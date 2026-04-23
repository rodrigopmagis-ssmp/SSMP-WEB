import { useState, useEffect, useRef } from 'react';
import { SlaTimerState } from '../types';

/**
 * useSLATimer – Timer regressivo baseado em um limite de tempo ISO string.
 * Atualiza a cada segundo. Não depende de polling no banco.
 * 
 * @param limiteISO  - ISO string do deadline (ex: negocio.sla_primeiro_contato_limite)
 * @param totalSecs  - Duração total em segundos para calcular percentual (default: 300 = 5 min)
 */
export function useSLATimer(
    limiteISO: string | null | undefined,
    totalSecs = 300
): SlaTimerState {
    const getState = (): SlaTimerState => {
        if (!limiteISO) {
            return { secondsLeft: 0, isExpired: false, percentLeft: 100, urgency: 'ok' };
        }

        const diff = Math.floor((new Date(limiteISO).getTime() - Date.now()) / 1000);

        if (diff <= 0) {
            return { secondsLeft: 0, isExpired: true, percentLeft: 0, urgency: 'critical' };
        }

        const percentLeft = Math.min(100, Math.round((diff / totalSecs) * 100));
        const urgency: SlaTimerState['urgency'] =
            diff <= 60 ? 'critical' : diff <= 120 ? 'warning' : 'ok';

        return { secondsLeft: diff, isExpired: false, percentLeft, urgency };
    };

    const [state, setState] = useState<SlaTimerState>(getState);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!limiteISO) return;

        setState(getState());

        intervalRef.current = setInterval(() => {
            const next = getState();
            setState(next);

            // Auto-clear once expired
            if (next.isExpired && intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [limiteISO, totalSecs]);

    return state;
}

/**
 * Formata secondsLeft em MM:SS
 */
export function formatSLATimer(secondsLeft: number): string {
    if (secondsLeft <= 0) return '00:00';
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
