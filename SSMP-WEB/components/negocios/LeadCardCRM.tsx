import React from 'react';
import { NegocioCRM } from '../../types';
import { useSLATimer, formatSLATimer } from '../../hooks/useSLATimer';
import { ScoreBadge } from './ScoreBadge';
import { COLUNA_CONFIG } from '../../lib/kanbanConfig';

interface LeadCardCRMProps {
    negocio: NegocioCRM;
    corBloco: string;
    onClick: (tab?: 'details' | 'whatsapp' | 'history' | 'followup') => void;
    onDragStart: (e: React.DragEvent, negocio: NegocioCRM) => void;
    onDragEnd: () => void;
}

const ORIGEM_COLORS: Record<string, string> = {
    instagram: '#e1306c',
    facebook: '#1877f2',
    google: '#4285f4',
    meta: '#0082fb',
    indicacao: '#059669',
    site: '#6366f1',
    tiktok: '#06b6d4',
};

const TEMP_CONFIG: Record<string, { cor: string; label: string }> = {
    'Ultra Quente': { cor: '#d97706', label: 'VIP' },
    'Quente': { cor: '#059669', label: 'HOT' },
    'Morno': { cor: '#3b82f6', label: 'Morno' },
    'Frio': { cor: '#6366f1', label: 'FRIO' },
};

/** Deriva deadline SLA: usa DB column se existir, senão criado_em + slaMinutos */
function derivarSLADeadline(
    slaLimite: string | null | undefined,
    criadoEm: string | null | undefined,
    slaMinutos: number
): string | undefined {
    if (slaLimite) return slaLimite;
    if (!criadoEm) return undefined;
    const d = new Date(criadoEm);
    d.setMinutes(d.getMinutes() + slaMinutos);
    return d.toISOString();
}

/** ── SLA Countdown – elemento dominante do card ── */
const SLACountdown: React.FC<{
    limite: string | undefined;
    totalSecs: number;
    corBloco: string;
}> = ({ limite, totalSecs, corBloco }) => {
    const { secondsLeft, isExpired, percentLeft, urgency } = useSLATimer(limite, totalSecs);
    if (!limite) return null;

    const barColor = isExpired || urgency === 'critical'
        ? '#ef4444'
        : urgency === 'warning'
            ? '#f59e0b'
            : corBloco;

    const textColor = isExpired || urgency === 'critical'
        ? '#ef4444'
        : urgency === 'warning'
            ? '#d97706'
            : '#374151'; // gray-700

    return (
        <div className="flex flex-col gap-1.5 mt-0.5">
            <div className="flex items-center justify-between">
                <div
                    className={`flex items-center gap-1.5 font-mono font-black text-[14px] tabular-nums ${isExpired ? 'animate-pulse' : ''}`}
                    style={{ color: textColor }}
                >
                    <span
                        className="material-symbols-outlined text-[13px] flex-shrink-0"
                        style={{ color: barColor }}
                    >
                        {isExpired ? 'alarm_off' : 'timer'}
                    </span>
                    {isExpired
                        ? <span className="text-[10px] uppercase tracking-widest font-black">SLA Expirado</span>
                        : <span>● {formatSLATimer(secondsLeft)}</span>
                    }
                </div>
                <span className="text-[9px] tabular-nums font-medium text-gray-400">
                    {Math.max(0, Math.round(percentLeft))}%
                </span>
            </div>

            {/* Barra grossa de progresso (5px) */}
            <div className="h-[5px] w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                <div
                    className="h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${Math.max(0, percentLeft)}%`, backgroundColor: barColor }}
                />
            </div>
        </div>
    );
};

/** ── LeadCardCRM – Light theme, alinhado ao projeto ──
 *  Hierarquia visual: Nome/Procedimento > Score > Tags > Timer > Ações */
export const LeadCardCRM: React.FC<LeadCardCRMProps> = ({
    negocio,
    corBloco,
    onClick,
    onDragStart,
    onDragEnd,
}) => {
    const lead = (negocio as any).lead ?? (negocio as any).leads ?? null;
    const score = lead?.ai_score ?? 0;
    const isViolation = negocio.sla_estourou === true;

    // SLA
    const colunaInfo = negocio.coluna ? COLUNA_CONFIG[negocio.coluna] : null;
    const slaMinutos = colunaInfo?.slaMinutos ?? 30;
    const totalSecs = slaMinutos * 60;
    const slaDeadline = derivarSLADeadline(
        negocio.sla_primeiro_contato_limite,
        negocio.criado_em ?? (negocio as any).created_at,
        slaMinutos
    );

    // Origem
    const origemRaw = ((negocio.metadados as any)?.origem ?? lead?.origin ?? '').toLowerCase();
    const origemCor = ORIGEM_COLORS[origemRaw] || null;
    const origemLabel = origemRaw ? origemRaw.toUpperCase() : null;

    // Temperatura
    const temp = lead?.kanban_status ?? '';
    const tempCfg = TEMP_CONFIG[temp];

    // Urgência
    const isUrgente = lead?.ai_urgency === 'alta';
    const tentativas = (negocio as any).tentativas_contato ?? 0;

    return (
        <div
            draggable
            onDragStart={e => onDragStart(e, negocio)}
            onDragEnd={onDragEnd}
            onClick={() => onClick('details')}
            className={[
                'group relative rounded-xl cursor-grab active:cursor-grabbing select-none',
                'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md',
                'bg-white dark:bg-gray-800 border',
                isViolation
                    ? 'border-red-300 dark:border-red-700 shadow-sm shadow-red-100'
                    : 'border-gray-200 dark:border-gray-700 shadow-sm',
            ].join(' ')}
            style={{
                borderLeftColor: isViolation ? '#ef4444' : corBloco,
                borderLeftWidth: 3,
            }}
        >
            <div className="p-3 flex flex-col gap-2">

                {/* ── Row 1: Nome + Score ── */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[13px] text-gray-900 dark:text-white leading-tight truncate">
                            {lead?.name || 'Sem nome'}
                        </p>
                        {lead?.procedure_awareness && (
                            <p className="text-[10px] text-gray-400 truncate mt-0.5 italic">
                                {lead.procedure_awareness}
                            </p>
                        )}
                    </div>
                    <ScoreBadge score={score} />
                </div>

                {/* ── Row 2: Tags ── */}
                {(origemLabel || isUrgente || tempCfg || tentativas > 0) && (
                    <div className="flex items-center gap-1 flex-wrap">
                        {origemLabel && origemCor && (
                            <span
                                className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                                style={{
                                    backgroundColor: `${origemCor}15`,
                                    color: origemCor,
                                    border: `1px solid ${origemCor}30`,
                                }}
                            >
                                {origemLabel}
                            </span>
                        )}

                        {isUrgente && (
                            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                                URGENTE
                            </span>
                        )}

                        {tempCfg && (
                            <span
                                className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                                style={{
                                    backgroundColor: `${tempCfg.cor}12`,
                                    color: tempCfg.cor,
                                    border: `1px solid ${tempCfg.cor}25`,
                                }}
                            >
                                {tempCfg.label}
                            </span>
                        )}

                        {tentativas > 0 && (
                            <span className="text-[9px] font-medium text-gray-400 ml-auto">
                                {tentativas}×
                            </span>
                        )}
                    </div>
                )}

                {/* ── Row 3: SLA Timer (elemento dominante) ── */}
                <SLACountdown
                    limite={slaDeadline}
                    totalSecs={totalSecs}
                    corBloco={corBloco}
                />

                {/* ── Row 4: Quick actions ── */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={e => {
                            e.stopPropagation();
                            onClick('whatsapp');
                        }}
                        className="text-gray-300 hover:text-emerald-500 transition-colors"
                        title="Abrir Chat"
                    >
                        <span className="material-symbols-outlined text-[16px]">chat</span>
                    </button>

                    <button
                        onClick={e => { e.stopPropagation(); onClick('details'); }}
                        className="text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Ver detalhes"
                    >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    </button>
                </div>
            </div>

            {/* SLA Violation badge */}
            {isViolation && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-md animate-pulse">
                    <span className="material-symbols-outlined text-[9px] text-white">alarm_off</span>
                </div>
            )}
        </div>
    );
};
