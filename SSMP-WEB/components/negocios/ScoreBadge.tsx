import React from 'react';
import { getScoreCor } from '../../lib/kanbanConfig';

interface ScoreBadgeProps {
    score: number;
    size?: 'sm' | 'md';
}

/**
 * ScoreBadge – Badge de score de lead (0-100).
 * Cor muda por faixa: verde ≥80 | âmbar ≥60 | azul ≥40 | cinza <40
 */
export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, size = 'sm' }) => {
    const cor = getScoreCor(score);

    const dim = size === 'md'
        ? 'w-9 h-9 text-sm'
        : 'w-7 h-7 text-[11px]';

    return (
        <div
            className={`${dim} rounded-full flex items-center justify-center font-black border-2 flex-shrink-0`}
            style={{
                borderColor: cor,
                color: cor,
                backgroundColor: `${cor}15`,
            }}
            title={`Score do lead: ${score}/100`}
        >
            {score}
        </div>
    );
};
