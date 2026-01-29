import React, { useState, useEffect } from 'react';
import { Lead, ScriptStage, StageData } from '../types';
import { supabaseService } from '../src/services/supabaseService';
import ProtocolStageCard from './ProtocolStageCard';

// Icons
const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

interface LeadDetailsProps {
    lead: Lead;
    onBack: () => void;
    onReanalyze?: () => void;
    onUpdate?: () => void;
}

const LeadDetails: React.FC<LeadDetailsProps> = ({ lead, onBack, onReanalyze, onUpdate }) => {
    const [viewMode, setViewMode] = useState<'details' | 'sequence'>('details');
    const [procedures, setProcedures] = useState<any[]>([]);
    const [selectedProcedureId, setSelectedProcedureId] = useState<string>(lead.procedure_id || '');
    const [loadingScripts, setLoadingScripts] = useState(false);
    const [scripts, setScripts] = useState<ScriptStage[]>([]); // These are the master scripts
    const [protocolData, setProtocolData] = useState<Record<string, StageData>>(lead.protocol_data || {});
    const [expandedStage, setExpandedStage] = useState<string | null>(null);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    // Fetch Procedures on Mount
    useEffect(() => {
        const loadProcedures = async () => {
            const allProcedures = await supabaseService.getProcedures();
            setProcedures(allProcedures || []);
        };
        loadProcedures();
    }, []);

    // Fetch Scripts when Procedure is selected (or pre-selected)
    useEffect(() => {
        if (!selectedProcedureId) return;

        const loadScripts = async () => {
            setLoadingScripts(true);
            try {
                const fetchedScripts = await supabaseService.getScripts(selectedProcedureId);
                setScripts(fetchedScripts || []);
            } catch (error) {
                console.error("Error loading scripts", error);
            } finally {
                setLoadingScripts(false);
            }
        };

        loadScripts();
    }, [selectedProcedureId]);

    // Sync local state when lead updates
    useEffect(() => {
        setProtocolData(lead.protocol_data || {});
        setSelectedProcedureId(lead.procedure_id || '');
    }, [lead]);


    const handleSaveProtocolData = async (newData: Record<string, StageData>) => {
        setProtocolData(newData);
        try {
            await supabaseService.updateLeadProtocol(lead.id, {
                protocol_data: newData,
                procedure_id: selectedProcedureId
            });
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error saving lead protocol", error);
        }
    };

    const handleUpdateStage = async (stageId: string, updates: Partial<StageData>) => {
        const currentStageData = protocolData[stageId] || {};
        const newData = {
            ...protocolData,
            [stageId]: { ...currentStageData, ...updates }
        };
        await handleSaveProtocolData(newData);
    };

    const handleAssignProcedure = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        setSelectedProcedureId(newId);
        try {
            await supabaseService.updateLeadProtocol(lead.id, {
                procedure_id: newId,
                protocol_data: {}
            });
            setProtocolData({});
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error assigning procedure", error);
        }
    };

    const handleCopyScript = (text: string, stageId: string) => {
        navigator.clipboard.writeText(text);
        setCopyFeedback(stageId);
        setTimeout(() => setCopyFeedback(null), 2000);
    };

    const handleSendWhatsapp = (text: string) => {
        let phone = lead.whatsapp?.replace(/\D/g, '') || '';
        if (!phone.startsWith('55') && phone.length > 2) phone = `55${phone}`;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="py-3 px-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800 shrink-0 h-16">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        aria-label="Voltar"
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <Icon name="arrow_back" className="text-xl" />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {lead.name}
                            <span className={`text-xs px-2 py-0.5 rounded-md border font-normal ${urgencyColor(lead.ai_urgency)}`}>
                                Urgência {lead.ai_urgency}
                            </span>
                        </h2>
                        <div className="flex items-center gap-2 text-gray-500 text-xs text-nowrap">
                            <Icon name="calendar_today" className="text-sm" />
                            {new Date(lead.created_at).toLocaleDateString()} às {new Date(lead.created_at).toLocaleTimeString()}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher Buttons */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 mr-2">
                        <button
                            onClick={() => setViewMode('details')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'details'
                                ? 'bg-white dark:bg-gray-600 text-primary shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <Icon name="person" className="text-sm" />
                            Detalhes
                        </button>
                        <button
                            onClick={() => setViewMode('sequence')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'sequence'
                                ? 'bg-white dark:bg-gray-600 text-primary shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <Icon name="route" className="text-sm" />
                            Acompanhamento
                        </button>
                    </div>

                    <button
                        onClick={onReanalyze}
                        title="Recalcular análise de IA"
                        className="px-3 py-1.5 bg-purple text-white rounded-lg hover:bg-opacity-90 transition flex items-center gap-1.5 text-xs font-semibold"
                    >
                        <Icon name="psychology" className="text-sm" />
                        Reanalisar IA
                    </button>
                    <a
                        href={`https://wa.me/55${(lead.whatsapp || '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-whatsapp text-white rounded-lg hover:bg-opacity-90 transition flex items-center gap-1.5 text-xs font-bold"
                    >
                        <Icon name="chat" className="text-sm" />
                        WhatsApp
                    </a>
                </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1">
                {viewMode === 'details' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 animate-in fade-in duration-300">
                        {/* Left Col: AI Analysis - span 1 */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-gray-800 dark:text-white mb-2">
                                <Icon name="auto_awesome" className="text-purple" />
                                <h3 className="text-lg font-bold">Análise de Inteligência Artificial</h3>
                            </div>

                            {/* AI Score Card */}
                            <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center">
                                <div className="relative inline-flex items-center justify-center mb-4">
                                    <svg className="w-32 h-32 transform -rotate-90">
                                        <circle className="text-gray-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64" />
                                        <circle
                                            className={`${getScoreColor(lead.ai_score).split(' ')[0]} transition-all duration-1000 ease-out`}
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
                                <p className="text-gray-400 font-medium text-sm uppercase tracking-wider">Potencial de Fechamento</p>
                            </div>

                            {/* Summary Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
                                    <h4 className="font-bold text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider">Resumo da IA</h4>
                                </div>
                                <div className="p-6">
                                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                                        {lead.ai_summary || "Aguardando análise detalhada..."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right Col: Lead Data - span 2 */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center gap-2 text-gray-800 dark:text-white mb-2">
                                <Icon name="person" className="text-primary" />
                                <h3 className="text-lg font-bold">Dados do Lead</h3>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8">
                                <div className="grid md:grid-cols-2 gap-y-8 gap-x-12">
                                    <InfoItem label="Nome" value={lead.name} icon="badge" />
                                    <InfoItem label="WhatsApp" value={lead.whatsapp} icon="call" />

                                    <div className="col-span-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                                            <Icon name="sentiment_dissatisfied" className="text-[14px]" /> Dores / Queixas
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {lead.concerns.map((c, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-bold border border-red-100 shadow-sm">{c}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <InfoItem label="Já tem procedimento em mente?" value={lead.procedure_awareness} icon="psychology_alt" />
                                    <InfoItem label="Experiência Prévia" value={lead.previous_experience} icon="history" />
                                    <InfoItem label="Faixa de Investimento" value={lead.budget_range} icon="attach_money" />
                                    <InfoItem label="Tempo Previsto" value={lead.timeline} icon="schedule" />
                                    <InfoItem label="Nível de Compromisso" value={lead.commitment_level} icon="handshake" />
                                </div>

                                {lead.observations && (
                                    <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                                        <h4 className="text-xs font-bold text-yellow-700 dark:text-yellow-500 mb-2 flex items-center gap-1">Observações</h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{lead.observations}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Follow-up Sequence Content */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Icon name="route" className="text-primary" />
                                Sequência de Acompanhamento
                            </h3>

                            <div className="w-72">
                                <select
                                    value={selectedProcedureId}
                                    onChange={handleAssignProcedure}
                                    className="w-full text-sm rounded-lg border-gray-300 focus:ring-primary focus:border-primary bg-white shadow-sm p-2.5"
                                >
                                    <option value="">Selecione um Procedimento...</option>
                                    {procedures.map(wd => (
                                        <option key={wd.id} value={wd.id}>{wd.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {!selectedProcedureId ? (
                            <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                <Icon name="ads_click" className="text-5xl mb-4 opacity-50 block mx-auto" />
                                <p className="font-medium text-lg">Selecione um procedimento acima para iniciar o acompanhamento</p>
                                <p className="text-sm mt-2 opacity-75">Isso irá carregar o script e as etapas para este lead.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-w-4xl mx-auto pb-10">
                                {loadingScripts ? (
                                    <div className="p-12 text-center text-gray-500">
                                        <Icon name="sync" className="animate-spin text-3xl block mx-auto mb-3" />
                                        <p className="text-base font-medium">Carregando script...</p>
                                    </div>
                                ) : scripts.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                                        <p>Nenhum script encontrado para este procedimento.</p>
                                    </div>
                                ) : (
                                    scripts.map((script, index) => {
                                        const stageId = `stage${index + 1}`;
                                        const data = protocolData[stageId] || {};
                                        // Determine status
                                        const isCompleted = !!data.messageSentAt && (data.hasResponded !== null && data.hasResponded !== undefined);
                                        const prevStageId = `stage${index}`;
                                        const isPrevCompleted = index === 0 ? true : (protocolData[prevStageId]?.messageSentAt && protocolData[prevStageId]?.hasResponded !== null);
                                        const isActive = !isCompleted && isPrevCompleted;

                                        return (
                                            <ProtocolStageCard
                                                key={stageId}
                                                stageId={stageId}
                                                stageNum={index + 1}
                                                title={script.title || `Etapa ${index + 1}`}
                                                scriptInfo={{
                                                    template: script.template,
                                                    actions: script.actions,
                                                    requestMedia: script.requestMedia
                                                }}
                                                stageData={data}
                                                isActive={isActive || isCompleted}
                                                isCompleted={isCompleted}
                                                isSkipped={false}
                                                patientName={lead.name}
                                                isExpanded={expandedStage === stageId}
                                                onToggleExpand={() => setExpandedStage(expandedStage === stageId ? null : stageId)}
                                                onUpdateStage={(updates) => handleUpdateStage(stageId, updates)}
                                                onSendWhatsapp={handleSendWhatsapp}
                                                onCopyScript={(text) => handleCopyScript(text, stageId)}
                                                copyFeedback={copyFeedback}
                                            />
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const InfoItem = ({ label, value, icon }: { label: string, value: string, icon: string }) => (
    <div className="group">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 group-hover:text-primary transition-colors">
            <Icon name={icon} className="text-[16px]" /> {label}
        </h4>
        <p className="text-gray-800 dark:text-gray-200 font-medium text-lg border-l-2 border-transparent pl-0">
            {value || '-'}
        </p>
    </div>
);

export default LeadDetails;
