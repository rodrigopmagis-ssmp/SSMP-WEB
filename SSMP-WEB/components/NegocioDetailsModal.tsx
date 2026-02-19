import React, { useState, useEffect, useRef } from 'react';
import { Negocio, AtividadeNegocio, MotivoPerda, CampaignStage, ScriptStage, Campaign } from '../types';
import { negociosService } from '../src/services/negociosService';
import { whatsappService } from '../src/services/whatsappService';
import { supabase } from '../src/lib/supabase';
import { cleanAndFormatScript } from '../src/utils/scriptFormatter';
import toast from 'react-hot-toast';

// Icons
const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

interface NegocioDetailsModalProps {
    negocio: Negocio;
    onClose: () => void;
    onUpdate: () => void;
    campaignStages?: CampaignStage[];
}

export function NegocioDetailsModal({ negocio, onClose, onUpdate, campaignStages = [] }: NegocioDetailsModalProps) {
    const [atividades, setAtividades] = useState<AtividadeNegocio[]>([]);
    const [loadingAtividades, setLoadingAtividades] = useState(true);
    const [showLossForm, setShowLossForm] = useState(false);
    const [motivoPerda, setMotivoPerda] = useState<MotivoPerda>('sem_interesse');
    const [detalhesPerda, setDetalhesPerda] = useState('');
    const [nota, setNota] = useState('');
    const [dataAgendamento, setDataAgendamento] = useState('');
    const [activeTab, setActiveTab] = useState<'details' | 'whatsapp' | 'history' | 'followup'>('details');
    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isEditingStage, setIsEditingStage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([
        { id: 1, text: 'Olá, sou o Rodrigo! Em que posso ajudar?', sender: 'lead', time: '10:30' },
        { id: 2, text: 'Oi Rodrigo! Recebi seu contato. Gostaria de saber mais sobre os procedimentos de Harmonização Facial.', sender: 'clinic', time: '10:32' },
        { id: 3, text: 'Claro! Vou enviar nossa tabela de valores e as datas disponíveis.', sender: 'clinic', time: '10:33' },
    ]);
    const [followupStages, setFollowupStages] = useState<ScriptStage[]>([]);
    const [loadingFollowup, setLoadingFollowup] = useState(false);
    const [expandedStageId, setExpandedStageId] = useState<string | null>(null);

    // Controle de Contato states
    const [followupTracking, setFollowupTracking] = useState<Record<string, any>>({});
    const [registeringResponseFor, setRegisteringResponseFor] = useState<string | null>(null);
    const [tempResponseContent, setTempResponseContent] = useState('');
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const [skipData, setSkipData] = useState<{ stageId: string | null; reason: string }>({ stageId: null, reason: '' });

    useEffect(() => {
        loadAtividades();
        loadFollowupStages();
        loadFollowupTracking();
    }, [negocio.id]);

    // Bloquear scroll do body quando o modal estiver aberto
    useEffect(() => {
        // Adicionar classe que bloqueia o scroll
        document.body.style.overflow = 'hidden';

        // Cleanup: restaurar scroll quando o modal for fechado
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const loadAtividades = async () => {
        try {
            setLoadingAtividades(true);
            const data = await negociosService.buscarAtividades(negocio.id);
            setAtividades(data);
        } catch (error) {
            console.error('Erro ao carregar atividades:', error);
        } finally {
            setLoadingAtividades(false);
        }
    };

    const loadFollowupStages = async () => {
        try {
            setLoadingFollowup(true);

            // Buscar a campanha associada ao negócio
            const { data: deal, error: dealError } = await supabase
                .from('negocios')
                .select('campaign_id')
                .eq('id', negocio.id)
                .single();

            if (dealError || !deal?.campaign_id) {
                console.log('Negócio sem campanha associada');
                setFollowupStages([]);
                return;
            }

            // Buscar a campanha com followup_config
            const { data: campaign, error: campaignError } = await supabase
                .from('campaigns')
                .select('followup_config')
                .eq('id', deal.campaign_id)
                .single();

            if (campaignError) {
                console.error('Erro ao buscar campanha:', campaignError);
                setFollowupStages([]);
                return;
            }

            setFollowupStages(campaign.followup_config || []);
        } catch (error) {
            console.error('Erro ao carregar estágios de acompanhamento:', error);
            setFollowupStages([]);
        } finally {
            setLoadingFollowup(false);
        }
    };

    const loadFollowupTracking = async () => {
        try {
            const { data, error } = await supabase
                .from('followup_tracking')
                .select('*')
                .eq('negocio_id', negocio.id);

            if (error) throw error;

            const trackingMap: Record<string, any> = {};
            data?.forEach(item => {
                trackingMap[item.stage_id] = item;
            });
            setFollowupTracking(trackingMap);
        } catch (error) {
            console.error('Erro ao carregar tracking:', error);
        }
    };

    const handleRegisterSent = async (stageId: string) => {
        try {
            const now = new Date();
            // Store as ISO string for timestamp compatibility
            const isoTime = now.toISOString();

            const { error } = await supabase
                .from('followup_tracking')
                .upsert({
                    negocio_id: negocio.id,
                    stage_id: stageId,
                    message_sent_at: isoTime
                }, {
                    onConflict: 'negocio_id,stage_id'
                });

            if (error) throw error;

            await loadFollowupTracking();
            toast.success('Envio registrado!');
        } catch (error) {
            console.error('Erro ao registrar envio:', error);
            toast.error(`Erro ao registrar envio: ${error.message || JSON.stringify(error)}`);
        }
    };

    const handleConfirmResponse = async (stageId: string, responded: boolean) => {
        if (responded) {
            setRegisteringResponseFor(stageId);
        } else {
            try {
                const now = new Date();
                const isoTime = now.toISOString();

                const { error } = await supabase
                    .from('followup_tracking')
                    .update({
                        has_responded: false,
                        response_content: 'Não respondeu',
                        message_responded_at: isoTime
                    })
                    .eq('negocio_id', negocio.id)
                    .eq('stage_id', stageId);

                if (error) throw error;

                await loadFollowupTracking();
                toast.success('Resposta registrada');
            } catch (error) {
                console.error('Erro ao registrar resposta:', error);
                toast.error('Erro ao registrar resposta');
            }
        }
    };

    const handleSaveResponse = async (stageId: string) => {
        if (!tempResponseContent.trim()) return;

        try {
            const now = new Date();
            const isoTime = now.toISOString();

            const { error } = await supabase
                .from('followup_tracking')
                .update({
                    has_responded: true,
                    response_content: tempResponseContent,
                    message_responded_at: isoTime
                })
                .eq('negocio_id', negocio.id)
                .eq('stage_id', stageId);

            if (error) throw error;

            await loadFollowupTracking();
            setRegisteringResponseFor(null);
            setTempResponseContent('');
            toast.success('Resposta salva!');
        } catch (error) {
            console.error('Erro ao salvar resposta:', error);
            toast.error('Erro ao salvar resposta');
        }
    };

    const handleToggleChecklist = async (stageId: string, actionIndex: number, checked: boolean) => {
        try {
            // Optimistic update
            const currentTracking = followupTracking[stageId] || {};
            const currentChecklist = currentTracking.checklist || {};

            // Store object with timestamp for new checks
            const newItem = checked
                ? { value: true, timestamp: new Date().toISOString() }
                : { value: false, timestamp: null };

            const newChecklist = {
                ...currentChecklist,
                [actionIndex]: newItem
            };

            const newTracking = {
                ...currentTracking,
                checklist: newChecklist
            };

            setFollowupTracking(prev => ({
                ...prev,
                [stageId]: newTracking
            }));

            // Persist to Supabase
            // We include existing fields to ensure safe UPSERT behavior
            const upsertPayload = {
                negocio_id: negocio.id,
                stage_id: stageId,
                checklist: newChecklist,
                updated_at: new Date().toISOString(),
                // Preserving existing state if meaningful to prevent overwrite/reset issues
                message_sent_at: currentTracking.message_sent_at,
                has_responded: currentTracking.has_responded,
                response_content: currentTracking.response_content,
                message_responded_at: currentTracking.message_responded_at,
                status: currentTracking.status || 'pending',
                completed_at: currentTracking.completed_at,
                skipped_at: currentTracking.skipped_at,
                skip_reason: currentTracking.skip_reason
            };

            const { error } = await supabase
                .from('followup_tracking')
                .upsert(upsertPayload, {
                    onConflict: 'negocio_id,stage_id'
                });

            if (error) throw error;

            // We don't reload immediately to keep the smoother UI state, 
            // unless we want to confirm server timestamp.
        } catch (error: any) {
            console.error('Erro ao atualizar checklist:', error);
            toast.error(`Erro ao atualizar checklist: ${error.message || JSON.stringify(error)}`);
            // Revert on error
            loadFollowupTracking();
        }
    };

    const handleCompleteStage = async (stageId: string) => {
        try {
            const currentTracking = followupTracking[stageId] || {};
            const { error } = await supabase
                .from('followup_tracking')
                .upsert({
                    negocio_id: negocio.id,
                    stage_id: stageId,
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    // Preserva outros campos
                    checklist: currentTracking.checklist || {},
                    message_sent_at: currentTracking.message_sent_at,
                    has_responded: currentTracking.has_responded,
                    response_content: currentTracking.response_content,
                    message_responded_at: currentTracking.message_responded_at
                }, { onConflict: 'negocio_id,stage_id' });

            if (error) throw error;
            toast.success('Etapa concluída com sucesso!');
            loadFollowupTracking();
        } catch (error: any) {
            console.error('Erro ao concluir etapa:', error);
            toast.error('Erro ao concluir etapa');
        }
    };

    const handleSkipStage = async (stageId: string, reason: string) => {
        try {
            const currentTracking = followupTracking[stageId] || {};
            const { error } = await supabase
                .from('followup_tracking')
                .upsert({
                    negocio_id: negocio.id,
                    stage_id: stageId,
                    status: 'skipped',
                    skipped_at: new Date().toISOString(),
                    skip_reason: reason,
                    updated_at: new Date().toISOString(),
                    // Preserva outros campos
                    checklist: currentTracking.checklist || {},
                    message_sent_at: currentTracking.message_sent_at,
                    has_responded: currentTracking.has_responded,
                    response_content: currentTracking.response_content,
                    message_responded_at: currentTracking.message_responded_at
                }, { onConflict: 'negocio_id,stage_id' });

            if (error) throw error;
            toast.success('Etapa pulada com sucesso!');
            setSkipData({ stageId: null, reason: '' }); // Reset modal
            loadFollowupTracking();
        } catch (error: any) {
            console.error('Erro ao pular etapa:', error);
            toast.error('Erro ao pular etapa');
        }
    };

    const handleCopyScript = (text: string, stageId: string) => {
        navigator.clipboard.writeText(text);
        setCopyFeedback(stageId);
        toast.success('Script copiado!');
        setTimeout(() => setCopyFeedback(null), 2000);
    };

    const handleSendWhatsapp = (text: string) => {
        const phone = negocio.lead?.whatsapp || '';
        const cleanPhone = phone.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleStageChange = async (newStageId: string) => {
        try {
            const stage = campaignStages.find(s => s.id === newStageId);
            if (!stage) return;

            await negociosService.atualizarEstagio(negocio.id, newStageId, stage.title);
            setIsEditingStage(false);
            onUpdate();
        } catch (error) {
            console.error('Erro ao atualizar estágio:', error);
            alert('Erro ao atualizar estágio');
        }
    };

    const handleAddContactAttempt = async () => {
        try {
            await negociosService.registrarTentativaContato(negocio.id);
            if (nota) {
                await negociosService.registrarAtividade(
                    negocio.id,
                    'nota',
                    nota
                );
            }
            setNota('');
            await loadAtividades();
            onUpdate();
        } catch (error) {
            console.error('Erro ao adicionar tentativa:', error);
            alert('Erro ao adicionar tentativa de contrato');
        }
    };

    const handleMarkAsLost = async () => {
        if (!motivoPerda) {
            alert('Selecione um motivo de perda');
            return;
        }

        try {
            await negociosService.marcarComoPerdido(negocio.id, motivoPerda, detalhesPerda);
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Erro ao marcar como perdido:', error);
            alert('Erro ao marcar negócio como perdido');
        }
    };

    const handleScheduleConsultation = async () => {
        if (!dataAgendamento) {
            alert('Selecione uma data e hora');
            return;
        }

        try {
            await negociosService.atualizarAgendamento(negocio.id, dataAgendamento, false);
            await loadAtividades();
            onUpdate();
            setDataAgendamento('');
        } catch (error) {
            console.error('Erro ao agendar:', error);
            alert('Erro ao agendar consulta');
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        const msgTexto = newMessage;
        setNewMessage('');

        const msg = {
            id: Date.now(),
            text: msgTexto,
            sender: 'clinic',
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };

        setChatMessages(prev => [...prev, msg]);

        try {
            await whatsappService.sendMessage({
                negocioId: negocio.id,
                to: negocio.lead?.whatsapp || '',
                text: msgTexto,
                type: 'text'
            });
        } catch (error) {
            console.error('Erro ao enviar mensagem real:', error);
        }
    };

    const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !negocio.lead?.whatsapp) return;

        const msg = {
            id: Date.now(),
            text: `📁 Arquivo: ${file.name}`,
            sender: 'clinic',
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            type: 'file' as const
        };

        setChatMessages(prev => [...prev, msg]);

        try {
            await whatsappService.sendFile(negocio.id, negocio.lead.whatsapp, file);
        } catch (error) {
            console.error('Erro ao enviar arquivo real:', error);
        }
    };

    const addEmoji = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('pt-BR');
    };

    const formatTrackingDate = (dateString: string) => {
        if (!dateString) return '-';
        // Handle legacy format if exists
        if (dateString.includes('·')) return dateString;

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return `${date.toLocaleDateString('pt-BR')} · ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        } catch (e) {
            return dateString;
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // Helper for visual score color (LeadDetails Reference)
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

    const lead = negocio.lead;

    // Determine the first active stage (not completed and not skipped)
    const firstActiveStage = followupStages.find(stage => {
        const t = followupTracking[stage.id];
        return !t || (t.status !== 'completed' && t.status !== 'skipped');
    });
    const currentStageId = firstActiveStage?.id;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="py-3 px-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800 shrink-0 h-16">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            aria-label="Voltar"
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <Icon name="arrow_back" className="text-xl" />
                        </button>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {lead?.name || 'Lead sem nome'}
                                {lead?.ai_urgency && (
                                    <span className={`text-xs px-2 py-0.5 rounded-md border font-normal ${urgencyColor(lead.ai_urgency)}`}>
                                        Urgência {lead.ai_urgency}
                                    </span>
                                )}
                            </h2>
                            <div className="flex items-center gap-2 text-gray-500 text-xs text-nowrap">
                                <Icon name="calendar_today" className="text-sm" />
                                {new Date(negocio.criado_em).toLocaleDateString()} às {new Date(negocio.criado_em).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Switcher Buttons */}
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 mr-2">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'details'
                                    ? 'bg-white dark:bg-gray-600 text-primary shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                <Icon name="description" className="text-sm" />
                                Detalhes
                            </button>
                            <button
                                onClick={() => setActiveTab('whatsapp')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'whatsapp'
                                    ? 'bg-white dark:bg-gray-600 text-primary shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                <Icon name="chat" className="text-sm" />
                                Conversar
                            </button>
                            <button
                                onClick={() => setActiveTab('followup')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'followup'
                                    ? 'bg-white dark:bg-gray-600 text-primary shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                <Icon name="timeline" className="text-sm" />
                                Acompanhamento
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'history'
                                    ? 'bg-white dark:bg-gray-600 text-primary shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                <Icon name="history" className="text-sm" />
                                Histórico
                            </button>
                        </div>

                        <button
                            title="Recalcular análise de IA"
                            className="px-3 py-1.5 bg-purple text-white rounded-lg hover:bg-opacity-90 transition flex items-center gap-1.5 text-xs font-semibold"
                        >
                            <Icon name="psychology" className="text-sm" />
                            Reanalisar IA
                        </button>
                        <a
                            href={`https://wa.me/55${(lead?.whatsapp || '').replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-whatsapp text-white rounded-lg hover:bg-opacity-90 transition flex items-center gap-1.5 text-xs font-bold"
                        >
                            <Icon name="chat" className="text-sm" />
                            WhatsApp
                        </a>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto flex-1 bg-white dark:bg-gray-800 custom-scrollbar">
                    {activeTab === 'details' && (
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
                                            {lead?.ai_score && (
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
                                            )}
                                        </svg>
                                        <span className={`absolute text-3xl font-bold ${getScoreColor(lead?.ai_score).split(' ')[0]}`}>
                                            {lead?.ai_score || 0}
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
                                            {lead?.ai_summary || "Aguardando análise detalhada..."}
                                        </p>
                                    </div>
                                </div>

                                {/* Deal Info Card */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
                                        <h4 className="font-bold text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider">Dados do Negócio</h4>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                            <span className="text-sm font-medium text-gray-500">Valor da Consulta</span>
                                            <span className="text-lg font-bold text-gray-900">{formatCurrency(negocio.valor_consulta)}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                            <span className="text-sm font-medium text-gray-500">Estágio Atual</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-primary">
                                                    {campaignStages.find(s => s.id === negocio.stage_id)?.title || negocio.estagio}
                                                </span>
                                                <button
                                                    onClick={() => setIsEditingStage(true)}
                                                    className="px-2 py-1 text-xs bg-white border border-gray-200 hover:bg-gray-50 rounded-md text-gray-600 font-bold transition-colors shadow-sm"
                                                >
                                                    Alterar
                                                </button>
                                            </div>
                                        </div>
                                        {/* Simple Actions */}
                                        <div className="pt-2 flex flex-col gap-2">
                                            <button onClick={() => setShowLossForm(true)} className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition">
                                                Marcar como Perdido
                                            </button>
                                        </div>
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
                                        <InfoItem label="Nome" value={lead?.name || '-'} icon="badge" />
                                        <InfoItem label="WhatsApp" value={lead?.whatsapp || '-'} icon="call" />

                                        <div className="col-span-2">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                                                <Icon name="sentiment_dissatisfied" className="text-[14px]" /> Dores / Queixas
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {lead?.concerns?.map((c, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-bold border border-red-100 shadow-sm">{c}</span>
                                                )) || <span className="text-gray-400 text-sm">Nenhuma queixa registrada</span>}
                                            </div>
                                        </div>

                                        <InfoItem label="Já tem procedimento em mente?" value={lead?.procedure_awareness || '-'} icon="psychology_alt" />
                                        <InfoItem label="Experiência Prévia" value={lead?.previous_experience || '-'} icon="history" />
                                        <InfoItem label="Faixa de Investimento" value={lead?.budget_range || '-'} icon="attach_money" />
                                        <InfoItem label="Tempo Previsto" value={lead?.timeline || '-'} icon="schedule" />
                                        <InfoItem label="Nível de Compromisso" value={lead?.commitment_level || '-'} icon="handshake" />
                                    </div>

                                    {lead?.observations && (
                                        <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                                            <h4 className="text-xs font-bold text-yellow-700 dark:text-yellow-500 mb-2 flex items-center gap-1">Observações</h4>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{lead.observations}</p>
                                        </div>
                                    )}
                                </div>



                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <Icon name="history" className="text-primary" /> Histórico Completo de Atividades
                                </h3>

                                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Adicionar Nota Rápida</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={nota}
                                            onChange={(e) => setNota(e.target.value)}
                                            placeholder="Escreva uma observação..."
                                            className="flex-1 rounded-lg border-gray-300 text-sm p-2.5"
                                        />
                                        <button
                                            onClick={handleAddContactAttempt}
                                            className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-opacity-90"
                                        >
                                            Salvar
                                        </button>
                                    </div>
                                </div>

                                <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pl-8 py-2">
                                    {loadingAtividades ? (
                                        <p className="text-center text-gray-400">Carregando...</p>
                                    ) : atividades.length === 0 ? (
                                        <p className="text-center text-gray-400 py-8">Nenhuma atividade registrada.</p>
                                    ) : (
                                        atividades.map((atv) => (
                                            <div key={atv.id} className="relative">
                                                <span className="absolute -left-[41px] top-0 w-5 h-5 bg-white border-2 border-primary rounded-full flex items-center justify-center">
                                                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                                                </span>
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                                                    <h4 className="text-gray-900 dark:text-white font-bold text-sm">
                                                        {atv.tipo_atividade.replace('_', ' ').toUpperCase()}
                                                    </h4>
                                                    <span className="text-xs text-gray-400 font-mono">
                                                        {formatDateTime(atv.criado_em)} by {atv.nome_usuario || 'Sistema'}
                                                    </span>
                                                </div>
                                                <p className="text-gray-600 dark:text-gray-300 text-sm bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                                    {atv.descricao}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'whatsapp' && (
                        <div className="whatsapp-container h-full flex flex-col bg-[#e5ddd5] rounded-xl overflow-hidden shadow-sm border border-gray-200">
                            {/* Reusing existing WhatsApp Logic */}
                            <div className="p-3 bg-[#075e54] text-white flex justify-between items-center shadow-md">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                                        <Icon name="person" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">{lead?.name}</h4>
                                        <p className="text-xs opacity-90 flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full"></span> Online</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat', backgroundSize: '400px' }}>
                                {chatMessages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.sender === 'clinic' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-lg shadow-sm text-sm relative ${msg.sender === 'clinic' ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                                            {msg.type === 'file' ? (
                                                <div className="flex items-center gap-2">
                                                    <Icon name="description" />
                                                    <span>{msg.text}</span>
                                                </div>
                                            ) : (
                                                <p>{msg.text}</p>
                                            )}
                                            <span className="text-[10px] text-gray-500 block text-right mt-1 flex items-center justify-end gap-0.5">
                                                {msg.time} {msg.sender === 'clinic' && <Icon name="done_all" className="text-blue-500 text-[14px]" />}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 bg-gray-100 flex items-center gap-2">
                                <button
                                    type="button"
                                    className="p-2 text-gray-500 hover:bg-gray-200 rounded-full"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    title="Adicionar emoji"
                                >
                                    <Icon name="mood" />
                                </button>
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        className="w-full rounded-full border border-gray-300 py-2 px-4 focus:outline-none focus:border-[#075e54]"
                                        placeholder="Digite uma mensagem"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    {showEmojiPicker && (
                                        <div className="absolute bottom-12 left-0 bg-white shadow-xl rounded-lg p-2 grid grid-cols-4 gap-2 border">
                                            {['😊', '👍', '❤️', '📅', '🏥', '✨', '🙏', '✅'].map(emoji => (
                                                <button key={emoji} onClick={() => addEmoji(emoji)} className="text-xl hover:bg-gray-100 p-1 rounded">{emoji}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className="p-2 bg-[#00897b] text-white rounded-full hover:bg-[#00796b] shadow-md transition"
                                    onClick={handleSendMessage}
                                    title="Enviar mensagem"
                                >
                                    <Icon name="send" />
                                </button>
                            </div>
                        </div>
                    )}


                    {activeTab === 'followup' && (
                        <div className="animate-in fade-in duration-300 min-h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Icon name="timeline" className="text-primary" /> Sequência de Acompanhamento
                                </h3>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-500 font-medium">0 de 4 Tarefas Concluídas</span>
                                    <button className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-xs font-bold flex items-center gap-1 transition-colors">
                                        <Icon name="delete" className="text-sm" /> Excluir
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 pb-10">
                                {loadingFollowup ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : followupStages.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Icon name="timeline" className="text-gray-300 text-5xl mb-3" />
                                        <p className="text-gray-500 font-medium">Nenhum estágio de acompanhamento configurado</p>
                                        <p className="text-sm text-gray-400 mt-1">Configure os estágios no Gerenciador de Campanhas</p>
                                    </div>
                                ) : (
                                    followupStages.map((stage, index) => {
                                        const tracking = followupTracking[stage.id];
                                        const isCompleted = tracking?.status === 'completed';
                                        const isSkipped = tracking?.status === 'skipped';

                                        // A stage is current if it matches the first active stage found
                                        const isCurrent = currentStageId === stage.id;

                                        // Status Text & Colors
                                        let statusText = 'AGUARDANDO';
                                        let statusColor = 'bg-gray-50 text-gray-500 border-gray-100 dark:bg-gray-800 dark:border-gray-700'; // Default/Future
                                        let numberBubbleColor = 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-700 dark:border-gray-600';
                                        let badgeColor = 'bg-gray-100 text-gray-500 border-gray-200';

                                        if (isCompleted) {
                                            statusText = 'CONCLUÍDO';
                                            statusColor = 'bg-green-50/50 text-green-800 border-green-200 dark:bg-green-900/10 dark:text-green-300 dark:border-green-800';
                                            numberBubbleColor = 'bg-green-500 text-white border-green-500 shadow-md shadow-green-200';
                                            badgeColor = 'bg-green-100 text-green-700 border-green-200';
                                        } else if (isSkipped) {
                                            statusText = 'ETAPA PULADA';
                                            statusColor = 'bg-yellow-50/50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/10 dark:text-yellow-300 dark:border-yellow-800';
                                            numberBubbleColor = 'bg-yellow-500 text-white border-yellow-500 shadow-md shadow-yellow-200';
                                            badgeColor = 'bg-yellow-100 text-yellow-700 border-yellow-200';
                                        } else if (isCurrent) {
                                            statusText = 'EM ANDAMENTO'; // Could also be "NO PRAZO" per image
                                            statusColor = 'bg-pink-50/50 text-pink-800 border-pink-200 dark:bg-pink-900/10 dark:text-pink-300 dark:border-pink-800 shadow-sm';
                                            numberBubbleColor = 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-200';
                                            badgeColor = 'bg-white text-pink-700 border-pink-200 shadow-sm';
                                        }

                                        return (
                                            <div key={stage.id} className="relative flex gap-4">
                                                {/* Timeline Line */}
                                                {index !== followupStages.length - 1 && (
                                                    <div className="absolute left-[19px] top-10 bottom-[-16px] w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                                                )}

                                                {/* Number Bubble */}
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 transition-all ${numberBubbleColor}`}>
                                                    {isCompleted ? <Icon name="check" className="text-lg" /> :
                                                        isSkipped ? <Icon name="fast_forward" className="text-sm" /> :
                                                            index + 1}
                                                </div>

                                                {/* Card */}
                                                <div className={`flex-1 rounded-xl border p-4 transition-all ${statusColor} ${isCurrent ? 'ring-1 ring-pink-200' : ''}`}>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div>
                                                            <h4 className="font-bold text-base text-gray-700 dark:text-gray-200">
                                                                {stage.title}
                                                            </h4>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                                    {stage.delay}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase">
                                                                Aguardando
                                                            </span>

                                                            <div className="flex items-center gap-1 ml-2">
                                                                <span className="text-xs font-bold text-gray-400 mr-1">Status:</span>
                                                                <div className={`px-2 py-1 rounded text-xs font-bold border ${badgeColor}`}>
                                                                    {statusText}
                                                                </div>
                                                                <button
                                                                    onClick={() => setExpandedStageId(expandedStageId === stage.id ? null : stage.id)}
                                                                    className={`p-1 hover:bg-gray-100 rounded-full text-gray-400 ml-1 transition-transform ${expandedStageId === stage.id ? 'rotate-180' : ''}`}
                                                                    title={expandedStageId === stage.id ? "Recolher" : "Expandir"}
                                                                >
                                                                    <Icon name="expand_more" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Detalhes expandidos */}
                                                    {expandedStageId === stage.id && (
                                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                                                            {/* Script de WhatsApp */}
                                                            {stage.template && (
                                                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                                                                    <div className="bg-[#fcf8f9] dark:bg-gray-800/80 px-4 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                                                                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                                                                            <Icon name="chat_bubble" className="text-sm" />
                                                                            Script de WhatsApp
                                                                        </label>
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                onClick={() => handleCopyScript(cleanAndFormatScript(stage.template || '', negocio.lead?.name?.split(' ')[0] || 'Paciente'), stage.id)}
                                                                                className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
                                                                                title="Copiar script"
                                                                            >
                                                                                <Icon name={copyFeedback === stage.id ? "check" : "content_copy"} className="text-sm" />
                                                                                {copyFeedback === stage.id ? 'Copiado!' : 'Copiar'}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleSendWhatsapp(cleanAndFormatScript(stage.template || '', negocio.lead?.name?.split(' ')[0] || 'Paciente'))}
                                                                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                                                                                title="Enviar via WhatsApp"
                                                                            >
                                                                                <Icon name="send" className="text-sm" />
                                                                                Enviar
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-5 bg-white dark:bg-gray-900/50">
                                                                        <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed font-medium whitespace-pre-line select-text">
                                                                            {cleanAndFormatScript(stage.template || '', negocio.lead?.name?.split(' ')[0] || 'Paciente')}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Controle de Contato */}
                                                            <div className="p-4 rounded-xl border bg-[#f4f7fa] dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="space-y-2 w-full">
                                                                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                                                            <Icon name="manage_accounts" className="text-sm" />
                                                                            Controle de Contato
                                                                        </h5>

                                                                        {(() => {
                                                                            const tracking = followupTracking[stage.id];

                                                                            if (!tracking?.message_sent_at) {
                                                                                // Estado inicial: Aguardando envio
                                                                                return (
                                                                                    <div className="space-y-2">
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                                                                                            Aguardando envio da mensagem...
                                                                                        </p>
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            // Check if response is pending (message sent but not yet responded)
                                                                            const isResponsePending = !tracking.message_responded_at && !registeringResponseFor;

                                                                            if (isResponsePending) {
                                                                                return (
                                                                                    <div className="space-y-3">
                                                                                        <div className="flex items-center gap-2 text-xs">
                                                                                            <Icon name="check_circle" className="text-green-600 text-sm" />
                                                                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                                                                                Mensagem enviada em <span className="font-bold">{formatTrackingDate(tracking.message_sent_at)}</span>
                                                                                            </span>
                                                                                        </div>

                                                                                        <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
                                                                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                                                                O paciente respondeu?
                                                                                            </p>
                                                                                            <div className="flex gap-2">
                                                                                                <button
                                                                                                    onClick={() => handleConfirmResponse(stage.id, true)}
                                                                                                    className="flex-1 py-2.5 bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                                                                                >
                                                                                                    <Icon name="thumb_up" className="text-sm" />
                                                                                                    Sim, respondeu
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => handleConfirmResponse(stage.id, false)}
                                                                                                    className="flex-1 py-2.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                                                                                >
                                                                                                    <Icon name="thumb_down" className="text-sm" />
                                                                                                    Não respondeu
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            if (registeringResponseFor === stage.id) {
                                                                                // Registrando resposta
                                                                                return (
                                                                                    <div className="space-y-3">
                                                                                        <div className="flex items-center gap-2 text-xs">
                                                                                            <Icon name="check_circle" className="text-green-600 text-sm" />
                                                                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                                                                                Mensagem enviada em <span className="font-bold">{formatTrackingDate(tracking.message_sent_at)}</span>
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                                                                                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 block">
                                                                                                Resumo da resposta:
                                                                                            </label>
                                                                                            <textarea
                                                                                                value={tempResponseContent}
                                                                                                onChange={(e) => setTempResponseContent(e.target.value)}
                                                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                                                                                                rows={3}
                                                                                                placeholder="Digite o resumo da resposta do paciente..."
                                                                                            />
                                                                                            <div className="flex gap-2 mt-2">
                                                                                                <button
                                                                                                    onClick={() => handleSaveResponse(stage.id)}
                                                                                                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors"
                                                                                                >
                                                                                                    Salvar Resposta
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        setRegisteringResponseFor(null);
                                                                                                        setTempResponseContent('');
                                                                                                    }}
                                                                                                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-xs font-medium transition-colors"
                                                                                                >
                                                                                                    Cancelar
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            // Resposta registrada
                                                                            return (
                                                                                <div className="space-y-2">
                                                                                    <div className="flex items-center gap-2 text-xs">
                                                                                        <Icon name="check_circle" className="text-green-600 text-sm" />
                                                                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                                                                            Mensagem enviada em <span className="font-bold">{formatTrackingDate(tracking.message_sent_at)}</span>
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                                                                                        <div className="flex items-start gap-2">
                                                                                            <Icon
                                                                                                name={tracking.has_responded ? "chat" : "cancel"}
                                                                                                className={`text-sm ${tracking.has_responded ? 'text-green-600' : 'text-gray-500'}`}
                                                                                            />
                                                                                            <div className="flex-1">
                                                                                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                                                                    {tracking.has_responded ? 'Respondeu' : 'SEM RESPOSTA'}
                                                                                                </p>
                                                                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                                                                                    {formatTrackingDate(tracking.message_responded_at)}
                                                                                                </p>
                                                                                                {tracking.has_responded && tracking.response_content && (
                                                                                                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-2 italic bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                                                                                                        "{tracking.response_content}"
                                                                                                    </p>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Checklist de Ações */}
                                                            {stage.actions && stage.actions.length > 0 && (
                                                                <div>
                                                                    <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                                                                        <Icon name="checklist" className="text-sm" />
                                                                        Checklist
                                                                    </h5>
                                                                    <div className="space-y-2">
                                                                        {stage.actions.map((action, actionIndex) => {
                                                                            const itemData = followupTracking[stage.id]?.checklist?.[actionIndex];
                                                                            // Handle both legacy (boolean) and new (object) formats
                                                                            const isChecked = typeof itemData === 'object' ? itemData?.value : !!itemData;
                                                                            const completedAt = typeof itemData === 'object' && itemData?.value && itemData?.timestamp
                                                                                ? new Date(itemData.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                                                                : null;

                                                                            // Determine icon based on action type
                                                                            let iconName = 'notifications';
                                                                            if (action.type === 'message') iconName = 'chat';
                                                                            else if (action.type === 'call') iconName = 'call';
                                                                            else if (action.type === 'photo_request') iconName = 'photo_camera';
                                                                            else if (action.type === 'appointment') iconName = 'event';
                                                                            else if (action.type === 'tag') iconName = 'label';
                                                                            else if (action.type === 'stage') iconName = 'flag';

                                                                            // Determine description text
                                                                            let description = action.description;
                                                                            if (!description) {
                                                                                if (action.type === 'tag') description = `Adicionar tag: ${action.value}`;
                                                                                else if (action.type === 'stage') description = `Alterar estágio: ${action.value}`;
                                                                                else if (action.type === 'notification') description = `Notificar: ${action.value}`;
                                                                                else description = 'Ação do checklist';
                                                                            }

                                                                            return (
                                                                                <div key={actionIndex} className={`rounded-lg p-3 text-xs border transition-colors ${isChecked ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-blue-300'}`}>
                                                                                    <label className="flex items-start gap-3 cursor-pointer">
                                                                                        <div className="relative flex items-center pt-0.5">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 shadow-sm checked:border-green-500 checked:bg-green-500 focus:ring-green-500/20"
                                                                                                checked={isChecked}
                                                                                                onChange={(e) => handleToggleChecklist(stage.id, actionIndex, e.target.checked)}
                                                                                            />
                                                                                            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none">
                                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                                                </svg>
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex-1">
                                                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <Icon name={iconName} className={`text-[16px] ${isChecked ? 'text-green-600' : 'text-gray-400'}`} />
                                                                                                    <span className={`font-medium ${isChecked ? 'text-green-700 dark:text-green-300 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                                                        {description}
                                                                                                    </span>
                                                                                                </div>
                                                                                                {completedAt && (
                                                                                                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                                                                        {completedAt}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </label>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}


                                                            {/* Stage Footer Actions */}
                                                            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                                                                {(!isCompleted && !isSkipped) && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => setSkipData({ stageId: stage.id, reason: '' })}
                                                                            className="px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-200 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                                                        >
                                                                            <Icon name="fast_forward" className="text-lg" />
                                                                            Pular Etapa
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleCompleteStage(stage.id)}
                                                                            disabled={stage.actions?.some((_, i) => {
                                                                                const item = followupTracking[stage.id]?.checklist?.[i];
                                                                                return typeof item === 'object' ? !item?.value : !item;
                                                                            })}
                                                                            className="px-4 py-2 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2"
                                                                        >
                                                                            <Icon name="check" className="text-lg" />
                                                                            Concluir Etapa
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {isCompleted && (
                                                                    <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                                                                        <Icon name="check_circle" className="text-sm" />
                                                                        Concluído em {formatTrackingDate(tracking?.completed_at)}
                                                                    </div>
                                                                )}

                                                                {isSkipped && (
                                                                    <div className="text-xs text-red-600 font-medium flex items-center gap-1">
                                                                        <Icon name="block" className="text-sm" />
                                                                        Pulado em {formatTrackingDate(tracking?.skipped_at)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Loss Modal Overlay */}
                {
                    showLossForm && (
                        <div className="absolute inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                                <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                                    <Icon name="cancel" /> Marcar como Perdido
                                </h3>

                                <label htmlFor="loss-motivo" className="block text-sm font-bold text-gray-700 mb-1">Motivo</label>
                                <select
                                    id="loss-motivo"
                                    value={motivoPerda}
                                    onChange={(e) => setMotivoPerda(e.target.value as MotivoPerda)}
                                    className="w-full rounded-lg border-gray-300 mb-4 p-2 focus:ring-red-500 focus:border-red-500"
                                >
                                    <option value="bloqueou">Bloqueou</option>
                                    <option value="sem_interesse">Sem Interesse</option>
                                    <option value="nao_respondeu">Não Respondeu</option>
                                    <option value="objecao_preco">Objeção de Preço</option>
                                    <option value="objecao_tempo">Objeção de Tempo</option>
                                    <option value="concorrente">Foi para Concorrente</option>
                                    <option value="nao_pode_pagar">Não Pode Pagar</option>
                                </select>

                                <label className="block text-sm font-bold text-gray-700 mb-1">Detalhes (Opcional)</label>
                                <textarea
                                    value={detalhesPerda}
                                    onChange={(e) => setDetalhesPerda(e.target.value)}
                                    className="w-full rounded-lg border-gray-300 mb-6 p-2 h-24 focus:ring-red-500 focus:border-red-500"
                                    placeholder="Descreva o motivo..."
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowLossForm(false)}
                                        className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleMarkAsLost}
                                        className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition shadow-lg shadow-red-200"
                                    >
                                        Confirmar Perda
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Stage Selection Modal */}
                {
                    isEditingStage && (
                        <div className="absolute inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Icon name="swap_horiz" className="text-primary" /> Mover para outro Estágio
                                    </h3>
                                    <button
                                        onClick={() => setIsEditingStage(false)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                        aria-label="Fechar seleção de estágio"
                                        title="Fechar"
                                    >
                                        <Icon name="close" />
                                    </button>
                                </div>

                                <div className="space-y-2 mb-6 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                                    {campaignStages.map(stage => {
                                        const isCurrent = negocio.stage_id === stage.id;
                                        return (
                                            <button
                                                key={stage.id}
                                                onClick={() => handleStageChange(stage.id)}
                                                disabled={isCurrent}
                                                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group
                                                ${isCurrent
                                                        ? 'bg-primary/5 border-primary/20 cursor-default'
                                                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600 hover:border-primary/50 hover:shadow-md hover:bg-white dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${isCurrent ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-500 group-hover:bg-primary/50'}`}></div>
                                                    <span className={`font-bold ${isCurrent ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}`}>
                                                        {stage.title}
                                                    </span>
                                                </div>
                                                {isCurrent && <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">Atual</span>}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setIsEditingStage(false)}
                                        className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Skip Stage Modal */}
                {
                    skipData.stageId && (
                        <div className="absolute inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Icon name="redo" className="text-gray-500" /> Pular Etapa
                                </h3>

                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Por favor, justifique o motivo de pular esta etapa. Isso ficará registrado no histórico.
                                    </p>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                            Justificativa <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={skipData.reason}
                                            onChange={(e) => setSkipData(prev => ({ ...prev, reason: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                                            rows={3}
                                            placeholder="Digite o motivo..."
                                        />
                                        <p className="text-xs text-right text-gray-400 mt-1">
                                            {skipData.reason.length}/10 caracteres mínimos
                                        </p>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            onClick={() => setSkipData({ stageId: null, reason: '' })}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => skipData.stageId && handleSkipStage(skipData.stageId, skipData.reason)}
                                            disabled={skipData.reason.length < 10}
                                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg font-bold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Confirmar e Pular
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
}

function InfoItem({ label, value, icon }: { label: string, value: string, icon: string }) {
    return (
        <div className="group">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 group-hover:text-primary transition-colors">
                <Icon name={icon} className="text-[16px]" /> {label}
            </h4>
            <p className="text-gray-800 dark:text-gray-200 font-medium text-lg border-l-2 border-transparent pl-0">
                {value || '-'}
            </p>
        </div>
    );
}
