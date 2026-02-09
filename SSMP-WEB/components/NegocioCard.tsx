import React from 'react';
import { Negocio } from '../types';
import { SLAIndicator } from './SLAIndicator';
import { getSLAUrgencyLevel, formatTimeInStage } from '../utils/slaCalculator';

interface NegocioCardProps {
  negocio: Negocio;
  onDragStart: (e: React.DragEvent, negocio: Negocio) => void;
  onDragEnd?: () => void;
  onClick: () => void;
}

export function NegocioCard({ negocio, onDragStart, onDragEnd, onClick }: NegocioCardProps) {
  const lead = negocio.lead;
  const slaLevel = getSLAUrgencyLevel(negocio);

  // Define a cor da tarja lateral conforme a urgência/temperatura do lead
  const getTemperatureColor = (urgency?: string): string => {
    switch (urgency?.toLowerCase()) {
      case 'alta': return 'border-l-red-500'; // Quente
      case 'média': return 'border-l-orange-500'; // Morno
      case 'baixa': return 'border-l-blue-500'; // Frio (Exemplo do usuário)
      default: return 'border-l-gray-300';
    }
  };

  const borderClass = getTemperatureColor(lead?.ai_urgency);

  const getUrgencyBadgeColor = (urgency?: string): string => {
    switch (urgency) {
      case 'alta': return '#EF4444';
      case 'média': return '#F59E0B';
      case 'baixa': return '#10B981';
      default: return '#9CA3AF';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-[#1E1E1E] border-y border-r border-l-[3px] border-gray-200 dark:border-gray-700/50 rounded-lg p-1.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-gray-600 group ${borderClass} ${slaLevel === 'critical' ? 'ring-2 ring-red-100 dark:ring-red-900/30 bg-red-50/10 dark:bg-red-900/5' : ''} hover:scale-[1.02] active:scale-[1.02] transform transition-transform duration-200`}
      draggable
      onDragStart={(e) => onDragStart(e, negocio)}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-1.5">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <h3 className="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate flex-1 leading-tight">{lead?.name || 'Lead'}</h3>
          {lead?.ai_score && (
            <span className={`text-[9px] font-bold px-0.5 py-0.5 rounded border leading-none ${lead.ai_score >= 80 ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
              lead.ai_score >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' :
                'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
              }`}>
              {lead.ai_score}
            </span>
          )}
        </div>
        {lead?.ai_urgency && (
          <span
            className="text-[8px] font-bold text-white px-1 py-0.5 rounded-full ml-1 shadow-sm leading-none"
            style={{ backgroundColor: getUrgencyBadgeColor(lead.ai_urgency) }}
          >
            {lead.ai_urgency.toUpperCase().substring(0, 3)}
          </span>
        )}
      </div>

      {/* SLA Indicator */}
      <div className="mb-2 scale-95 origin-left">
        <SLAIndicator negocio={negocio} />
      </div>

      {/* Body */}
      <div className="space-y-1 mb-1.5">
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined text-[0.8rem] text-gray-400 shrink-0">smartphone</span>
          <span className="text-[10px] truncate">{lead?.whatsapp || 'Sem telefone'}</span>
        </div>

        {lead?.concerns && lead.concerns.length > 0 && (
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <span className="material-symbols-outlined text-[0.8rem] text-gray-400 shrink-0">spa</span>
            <span className="text-[10px] truncate">{lead.concerns[0]}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-1.5 border-t border-gray-100 dark:border-gray-700/50 text-[9px]">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 group-hover:text-[#9a4c5f] transition-colors">
          <span className="material-symbols-outlined text-[0.8rem]">call</span>
          <span>{negocio.tentativas_contato}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
          <span className="material-symbols-outlined text-[0.8rem]">schedule</span>
          <span>{formatTimeInStage(negocio)}</span>
        </div>
      </div>
    </div>
  );
}
