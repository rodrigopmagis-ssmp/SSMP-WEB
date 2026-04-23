import React, { useState, useEffect } from 'react';
import { NegocioCRM, ColunaKanban, BlocoKanban } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { formatSLATimer } from '../../hooks/useSLATimer';

// ── CRM Captação Stages Config ─────────────────────────────────────────────
interface CaptacaoStage {
    coluna: ColunaKanban;
    label: string;
    /** Minutos após criado_em para envio automático desta etapa */
    offsetMinutos: number;
    /** Duração desta etapa (quanto tempo antes de avançar) */
    duracaoMinutos: number;
    script: string;
    icon: string;
}

const CAPTACAO_STAGES: CaptacaoStage[] = [
    {
        coluna: 'novo_lead',
        label: 'Novo Lead – Primeiro Contato',
        offsetMinutos: 0,
        duracaoMinutos: 5,
        icon: 'person_add',
        script:
            'Olá, {nome}! 😊\n\nTudo bem? Vi que você demonstrou interesse em {procedimento}.\n\nSou consultora da nossa clínica e adoraria entender melhor o que você busca para poder te ajudar da melhor forma.\n\nPodemos conversar agora?',
    },
    {
        coluna: 'contato_automatico_enviado',
        label: 'Contato Enviado – Aguardando Resposta',
        offsetMinutos: 5,
        duracaoMinutos: 25,
        icon: 'send',
        script:
            'Oi, {nome}! 👋\n\nEnviamos uma mensagem há pouco. Caso não tenha visto, ficamos à disposição para tirar todas as suas dúvidas sobre {procedimento}.\n\nQual seria o melhor horário para conversarmos? 😊',
    },
    {
        coluna: 'aguardando_resposta',
        label: 'Aguardando Resposta',
        offsetMinutos: 30,
        duracaoMinutos: 60,
        icon: 'hourglass_empty',
        script:
            'Oi, {nome}! Como vai? 🙂\n\nPercebemos que ainda não conseguimos te alcançar. Gostaríamos muito de apresentar as opções que temos para {procedimento}.\n\nRetorne quando puder. Estamos aqui para te ajudar! ✨',
    },
    {
        coluna: 'tentativa_2',
        label: 'Tentativa 2 – Último Contato',
        offsetMinutos: 90,
        duracaoMinutos: 1440,
        icon: 'phone_callback',
        script:
            'Olá, {nome}! 👋\n\nÉsta é nossa última tentativa de contato por aqui. Se tiver interesse em {procedimento}, ficamos à disposição no WhatsApp ou você pode agendar pelo nosso site.\n\nCuidamos de você com muito carinho! 💗',
    },
];

// ─────────────────────────────────────────────────────────────────────────────

function segundosRestantes(deadline: Date): number {
    return Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
}

function calcDeadline(criadoEm: Date, offsetMin: number, duracaoMin: number): Date {
    const d = new Date(criadoEm);
    d.setMinutes(d.getMinutes() + offsetMin + duracaoMin);
    return d;
}

/** Mini hook de contagem regressiva por segundo */
function useCountdown(deadline: Date) {
    const [secs, setSecs] = useState(() => segundosRestantes(deadline));
    useEffect(() => {
        const interval = setInterval(() => setSecs(segundosRestantes(deadline)), 1000);
        return () => clearInterval(interval);
    }, [deadline]);
    return secs;
}

// ── Single Stage Card ──────────────────────────────────────────────────────
interface StageCardProps {
    stage: CaptacaoStage;
    status: 'past' | 'current' | 'upcoming';
    index: number;
    criadoEm: Date;
    leadName: string;
    procedimento: string;
    onEnviarAgora: () => void;
    onLeadRespondeu: () => void;
}

const StageCard: React.FC<StageCardProps> = ({
    stage, status, index, criadoEm, leadName, procedimento,
    onEnviarAgora, onLeadRespondeu,
}) => {
    const [expanded, setExpanded] = useState(status === 'current');
    const deadline = calcDeadline(criadoEm, stage.offsetMinutos, stage.duracaoMinutos);
    const secs = useCountdown(deadline);
    const expired = secs === 0;

    const filledScript = stage.script
        .replace(/{nome}/g, leadName || 'você')
        .replace(/{procedimento}/g, procedimento || 'o procedimento');

    const statusStyles = {
        past: 'opacity-50',
        current: '',
        upcoming: 'opacity-40',
    };

    const timerColor = expired
        ? '#ef4444'
        : secs < 120 ? '#f59e0b'
            : '#2563eb';

    const dotColor = {
        past: 'bg-gray-300 border-gray-300',
        current: 'bg-blue-600 border-blue-600 text-white shadow-blue-200 shadow-md',
        upcoming: 'bg-gray-100 border-gray-200 text-gray-400',
    }[status];

    return (
        <div className={`relative flex gap-4 ${statusStyles[status]}`}>
            {/* Timeline line */}
            <div className="absolute left-[19px] top-10 bottom-[-20px] w-0.5 bg-gray-100" />

            {/* Dot */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 border-2 ${dotColor}`}>
                {status === 'past'
                    ? <span className="material-symbols-outlined text-base text-gray-400">check</span>
                    : index + 1}
            </div>

            {/* Card */}
            <div className={[
                'flex-1 rounded-xl border transition-all duration-200 overflow-hidden mb-4',
                status === 'current'
                    ? 'border-blue-200 shadow-sm shadow-blue-50'
                    : 'border-gray-200 bg-gray-50',
            ].join(' ')}>

                {/* Header — always visible */}
                <div
                    onClick={() => setExpanded(p => !p)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/80 transition-colors cursor-pointer"
                >
                    <span
                        className="material-symbols-outlined text-[18px] flex-shrink-0"
                        style={{ color: timerColor }}
                    >
                        {stage.icon}
                    </span>

                    <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-bold truncate ${status === 'upcoming' ? 'text-gray-400' : 'text-gray-800'}`}>
                            {stage.label}
                        </p>
                        {status === 'past' && (
                            <p className="text-[10px] text-gray-400 font-medium">CONCLUÍDO</p>
                        )}
                    </div>

                    {/* Timer badge */}
                    {status !== 'past' && (
                        <div
                            onClick={(e) => {
                                if (expired) {
                                    e.stopPropagation();
                                    onEnviarAgora();
                                }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[13px] font-black tabular-nums flex-shrink-0 ${expired ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                            style={{
                                color: timerColor,
                                backgroundColor: `${timerColor}12`,
                                border: `1px solid ${timerColor}30`,
                            }}
                            title={expired ? "Clique para enviar agora" : ""}
                        >
                            <span
                                className="material-symbols-outlined text-[13px]"
                                style={{ color: timerColor }}
                            >
                                {expired ? 'alarm_off' : 'timer'}
                            </span>
                            {expired
                                ? <span className="text-[10px] uppercase tracking-widest font-black">Envio agora</span>
                                : <span>{formatSLATimer(secs)}</span>
                            }
                        </div>
                    )}

                    <span
                        className={`material-symbols-outlined text-gray-400 text-[20px] transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
                    >
                        expand_more
                    </span>
                </div>

                {/* Expanded content */}
                {expanded && status !== 'past' && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4 bg-white">

                        {/* Script WhatsApp */}
                        <div className="rounded-xl overflow-hidden border border-gray-200">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-[#f0fdf4] border-b border-gray-200">
                                <div className="flex items-center gap-2 text-green-700">
                                    <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                                    <span className="text-[11px] font-bold uppercase tracking-widest">
                                        Script WhatsApp
                                        {!expired && (
                                            <span className="ml-2 font-normal text-green-600 normal-case">
                                                – auto-envio em {formatSLATimer(secs)}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(filledScript);
                                    }}
                                    className="text-[11px] font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
                                >
                                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                    Copiar
                                </button>
                            </div>
                            <div className="p-4 bg-white">
                                <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-line font-medium select-text">
                                    {filledScript}
                                </p>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={onEnviarAgora}
                                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">send</span>
                                Enviar Agora pelo WhatsApp
                            </button>

                            {status === 'current' && (
                                <button
                                    onClick={onLeadRespondeu}
                                    className="flex-1 py-2.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">mark_chat_read</span>
                                    Lead Respondeu ✓
                                </button>
                            )}
                        </div>

                        {expired && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                                <span className="material-symbols-outlined text-amber-600 text-[16px]">warning</span>
                                <p className="text-[11px] font-semibold text-amber-700">
                                    Automação já deveria ter enviado esta mensagem. Envie manualmente se não enviou.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────
interface CRMFollowupSequenceProps {
    negocio: NegocioCRM;
    onMoverColuna: (coluna: ColunaKanban, bloco: BlocoKanban) => void;
    onEnviarScript?: (script: string) => void;
}

export const CRMFollowupSequence: React.FC<CRMFollowupSequenceProps> = ({
    negocio, onMoverColuna, onEnviarScript
}) => {
    const lead = (negocio as any).lead ?? (negocio as any).leads ?? null;
    const nome = lead?.name || 'Lead';
    const proc = lead?.procedure_awareness || 'o procedimento';
    const criadoEm = new Date(negocio.criado_em ?? (negocio as any).created_at ?? Date.now());
    const colunaAtual: ColunaKanban = (negocio as any).coluna ?? 'novo_lead';

    const CAPTACAO_ORDER = CAPTACAO_STAGES.map(s => s.coluna);
    const currentIndex = CAPTACAO_ORDER.indexOf(colunaAtual as any);

    const handleEnviarAgora = (stage: CaptacaoStage) => {
        const script = stage.script
            .replace(/{nome}/g, nome)
            .replace(/{procedimento}/g, proc);

        if (onEnviarScript) {
            onEnviarScript(script);
            toast.success('Mensagem enviada no WhatsApp');
            return;
        }

        let phone = lead?.whatsapp?.replace(/\D/g, '') || '';
        if (!phone.startsWith('55') && phone.length > 2) {
            phone = `55${phone}`;
        }

        if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(script)}`, '_blank');
    };

    const handleLeadRespondeu = () => {
        onMoverColuna('respondido', 'qualificacao');
    };

    return (
        <div className="space-y-0">
            {CAPTACAO_STAGES.map((stage, i) => {
                let status: 'past' | 'current' | 'upcoming' = 'upcoming';
                if (colunaAtual === 'lead_frio') {
                    status = i <= CAPTACAO_ORDER.indexOf('tentativa_2') ? 'past' : 'upcoming';
                } else if (i < currentIndex) {
                    status = 'past';
                } else if (i === currentIndex) {
                    status = 'current';
                }

                return (
                    <StageCard
                        key={stage.coluna}
                        stage={stage}
                        status={status}
                        index={i}
                        criadoEm={criadoEm}
                        leadName={nome}
                        procedimento={proc}
                        onEnviarAgora={() => handleEnviarAgora(stage)}
                        onLeadRespondeu={handleLeadRespondeu}
                    />
                );
            })}

            {/* Lead Frio – terminal state */}
            <div className="relative flex gap-4 opacity-40">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 border-2 bg-red-50 border-red-200 text-red-400">
                    <span className="material-symbols-outlined text-base">ac_unit</span>
                </div>
                <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mb-4 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-gray-400">Lead Frio – Sem Resposta</span>
                    <button
                        onClick={() => onMoverColuna('lead_frio', 'captacao')}
                        className="text-[11px] font-bold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        Marcar como Frio
                    </button>
                </div>
            </div>
        </div>
    );
};
