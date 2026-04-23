import React from 'react';
import { useSLATimer, formatSLATimer } from '../../hooks/useSLATimer';

interface SLATimerProps {
    limite: string | null | undefined;
    totalSecs?: number;
    className?: string;
}

/**
 * SLATimer – Timer regressivo para cards do Kanban.
 * Visual: verde → âmbar (≤2min) → vermelho pulsante (expirado).
 */
export const SLATimer: React.FC<SLATimerProps> = ({
    limite,
    totalSecs = 300,
    className = '',
}) => {
    const { secondsLeft, isExpired, percentLeft, urgency } = useSLATimer(limite, totalSecs);

    if (!limite) return null;

    const colorClass = isExpired || urgency === 'critical'
        ? 'text-red-400 animate-pulse'
        : urgency === 'warning'
            ? 'text-amber-400'
            : 'text-emerald-400';

    const barColor = isExpired || urgency === 'critical'
        ? '#ef4444'
        : urgency === 'warning'
            ? '#f59e0b'
            : '#10b981';

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {/* Timer Display */}
            <div className={`flex items-center gap-1 font-mono text-[11px] font-bold ${colorClass}`}>
                <span className="material-symbols-outlined text-[12px]">
                    {isExpired ? 'alarm_off' : 'timer'}
                </span>
                <span>
                    {isExpired ? 'SLA ESTOURADO' : formatSLATimer(secondsLeft)}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="h-0.5 w-full bg-zinc-700 rounded-full overflow-hidden">
                <div
                    className="h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{
                        width: `${percentLeft}%`,
                        backgroundColor: barColor,
                    }}
                />
            </div>
        </div>
    );
};
