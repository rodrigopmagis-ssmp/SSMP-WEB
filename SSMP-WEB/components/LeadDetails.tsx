import React from 'react';
import { Lead } from '../types';

// Icons
const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

interface LeadDetailsProps {
    lead: Lead;
    onBack: () => void;
    onReanalyze?: () => void; // Placeholder for now
}

const LeadDetails: React.FC<LeadDetailsProps> = ({ lead, onBack, onReanalyze }) => {

    // Helper for visual score color
    const getScoreColor = (score?: number) => {
        if (!score) return 'text-gray-500 bg-gray-100';
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 50) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const urgencyColor = (urgency?: string) => {
        switch (urgency?.toLowerCase()) {
            case 'alta': return 'text-red-500 bg-red-50 border-red-200';
            case 'média': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
            case 'baixa': return 'text-green-500 bg-green-50 border-green-200';
            default: return 'text-gray-500 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        aria-label="Voltar"
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <Icon name="arrow_back" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {lead.name}
                            <span className={`text-sm px-2 py-0.5 rounded-md border font-normal ${urgencyColor(lead.ai_urgency)}`}>
                                Urgência {lead.ai_urgency}
                            </span>
                        </h2>
                        <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                            <Icon name="calendar_today" className="text-base" />
                            {new Date(lead.created_at).toLocaleDateString()} às {new Date(lead.created_at).toLocaleTimeString()}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onReanalyze}
                        title="Recalcular análise de IA"
                        className="px-4 py-2 bg-purple text-white rounded-lg hover:bg-opacity-90 transition flex items-center gap-2 text-sm font-semibold"
                    >
                        <Icon name="psychology" />
                        Reanalisar IA
                    </button>
                    <a
                        href={`https://wa.me/55${(lead.whatsapp || '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-whatsapp text-white rounded-lg hover:bg-opacity-90 transition flex items-center gap-2 text-sm font-bold"
                    >
                        <Icon name="chat" />
                        WhatsApp
                    </a>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:divide-x dark:divide-gray-700">

                {/* Left: AI Analysis */}
                <div className="p-8 lg:col-span-1 bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <Icon name="auto_awesome" className="text-purple" />
                        Análise de Inteligência Artificial
                    </h3>

                    {/* Score */}
                    <div className="mb-8 text-center">
                        <div className="relative inline-flex items-center justify-center">
                            <svg className="w-32 h-32 transform -rotate-90">
                                <circle
                                    className="text-gray-200 dark:text-gray-700"
                                    strokeWidth="8"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="58"
                                    cx="64"
                                    cy="64"
                                />
                                <circle
                                    className={`${getScoreColor(lead.ai_score).split(' ')[0]}`}
                                    strokeWidth="8"
                                    strokeDasharray={365}
                                    strokeDashoffset={365 - (365 * (lead.ai_score || 0)) / 100}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="58"
                                    cx="64"
                                    cy="64"
                                />
                            </svg>
                            <span className={`absolute text-3xl font-bold ${getScoreColor(lead.ai_score).split(' ')[0]}`}>
                                {lead.ai_score}
                            </span>
                        </div>
                        <p className="text-sm font-medium text-gray-500 mt-2">Potencial de Fechamento</p>
                    </div>

                    {/* Summary */}
                    <div className="mb-6">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Resumo da IA</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            {lead.ai_summary || "Nenhuma análise disponível."}
                        </p>
                    </div>

                    {/* Tags */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Tags Identificadas</h4>
                        <div className="flex flex-wrap gap-2">
                            {lead.ai_tags?.map((tag, i) => (
                                <span key={i} className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300 shadow-sm">
                                    {tag}
                                </span>
                            ))}
                            {(!lead.ai_tags || lead.ai_tags.length === 0) && <span className="text-gray-400 text-sm italic">Sem tags</span>}
                        </div>
                    </div>
                </div>

                {/* Right: Lead Data */}
                <div className="p-8 lg:col-span-2 space-y-8">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 border-b pb-4 dark:border-gray-700">
                        <Icon name="person" className="text-primary" />
                        Dados do Lead
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoItem label="Nome" value={lead.name} icon="badge" />
                        <InfoItem label="WhatsApp" value={lead.whatsapp} icon="call" />

                        <div className="md:col-span-2">
                            <h4 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1">
                                <Icon name="sentiment_dissatisfied" className="text-gray-400 text-base" /> Dores / Queixas
                            </h4>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {lead.concerns.map((concern, i) => (
                                    <span key={i} className="px-3 py-1 bg-red-50 text-red-600 rounded-md text-sm font-medium border border-red-100">
                                        {concern}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <InfoItem label="Já tem procedimento em mente?" value={lead.procedure_awareness} icon="psychology_alt" />
                        <InfoItem label="Experiência Prévia" value={lead.previous_experience} icon="history" />
                        <InfoItem label="Faixa de Investimento" value={lead.budget_range} icon="attach_money" />
                        <InfoItem label="Tempo Previsto" value={lead.timeline} icon="schedule" />
                        <InfoItem label="Nível de Compromisso" value={lead.commitment_level} icon="handshake" />

                        <div className="md:col-span-2">
                            <InfoItem label="Disponibilidade" value={lead.availability.join(', ')} icon="event_available" />
                        </div>

                        {lead.observations && (
                            <div className="md:col-span-2 bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                                <h4 className="text-sm font-bold text-yellow-700 dark:text-yellow-500 mb-1 flex items-center gap-1">
                                    <Icon name="sticky_note_2" /> Observações
                                </h4>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">{lead.observations}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ label, value, icon }: { label: string, value: string, icon: string }) => (
    <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Icon name={icon} className="text-[14px]" /> {label}
        </h4>
        <p className="text-gray-800 dark:text-gray-200 font-medium text-lg border-l-2 border-gray-200 dark:border-gray-700 pl-3">
            {value || '-'}
        </p>
    </div>
);

export default LeadDetails;
