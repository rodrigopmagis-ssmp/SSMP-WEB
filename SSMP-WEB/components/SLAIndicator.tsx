import React from 'react';
import { Negocio } from '../types';
import { getSLAUrgencyLevel, getTimeUntilViolation } from '../utils/slaCalculator';

interface SLAIndicatorProps {
  negocio: Negocio;
}

export function SLAIndicator({ negocio }: SLAIndicatorProps) {
  const level = getSLAUrgencyLevel(negocio);
  const timeInfo = getTimeUntilViolation(negocio);

  // Mapeamento de estilos por nível
  const styles = {
    normal: {
      container: 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30',
      icon: 'check_circle'
    },
    warning: {
      container: 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30',
      icon: 'warning'
    },
    critical: {
      container: 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30 animate-pulse',
      icon: 'error'
    }
  };

  const currentStyle = styles[level];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold w-fit ${currentStyle.container}`}>
      <span className="material-symbols-outlined text-[12px]">{currentStyle.icon}</span>
      <span className="whitespace-nowrap">
        {level === 'normal' ? 'No Prazo: ' : level === 'critical' ? 'Atrasado: ' : 'Atenção: '}
        {timeInfo}
      </span>
    </div>
  );
}
