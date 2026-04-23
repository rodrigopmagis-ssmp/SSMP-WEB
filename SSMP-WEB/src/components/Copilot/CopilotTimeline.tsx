import React, { useState, useEffect } from 'react';
import { useConsultationStatus } from '../../hooks/useConsultationStatus';
import { Consultation } from '../../../types';
import { supabaseService } from '../../services/supabaseService';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CopilotTimelineProps {
    consultationId: string;
    patientName?: string;
    onClose?: () => void;
}

export const CopilotTimeline: React.FC<CopilotTimelineProps> = ({ consultationId, patientName, onClose }) => {
    const { consultation, isLoading, error } = useConsultationStatus(consultationId);
    const [editedProntuario, setEditedProntuario] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (consultation?.aiProntuario) {
            // Se for string, tenta dar parse (defensivo)
            let parsed = consultation.aiProntuario;
            if (typeof parsed === 'string') {
                try { 
                    parsed = JSON.parse(parsed); 
                } catch (e) { 
                    console.error('Failed to parse aiProntuario JSON:', e);
                    parsed = {};
                }
            }
            
            // Garantir que temos um objeto para edição
            setEditedProntuario(parsed || {});
        } else if (consultation && !consultation.aiProntuario) {
            setEditedProntuario({});
        }
    }, [consultation]);

    const handleSave = async (status: 'draft' | 'signed' = 'draft') => {
        if (!consultation) return;

        setIsSaving(true);
        try {
            await supabaseService.updateConsultation(consultation.id, {
                aiProntuario: editedProntuario,
                status: status === 'signed' ? 'signed' : 'review_needed'
            });
            toast.success(status === 'signed' ? 'Prontuário assinado!' : 'Salvo com sucesso!');
            if (status === 'signed' && onClose) onClose();
        } catch (err) {
            console.error('Error saving consultation:', err);
            toast.error('Erro ao salvar prontuário.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading && !consultation) {
        return (
            <div className="flex items-center justify-center p-12">
                <span className="material-symbols-outlined text-blue-500 animate-spin text-3xl">progress_activity</span>
                <span className="ml-2 text-gray-500">Carregando consulta...</span>
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 p-4">Erro ao carregar consulta.</div>;
    }

    if (!consultation) return null;

    const isProcessing = consultation.status === 'processing';

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Header */}
            <div className="flex flex-col p-6 bg-white border-b sticky top-0 z-20 shadow-sm gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                                <span className="material-symbols-outlined text-white text-3xl">person</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                        {patientName || 'Paciente'}
                                    </h2>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">Paciente</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                        <span className="material-symbols-outlined text-[16px] text-blue-500">calendar_today</span>
                                        {consultation?.createdAt ? format(new Date(consultation.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '--/--/--'}
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                        <span className="material-symbols-outlined text-[16px] text-blue-500">timer</span>
                                        {formatDuration(consultation?.metadata?.duration)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status do Atendimento</span>
                            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide ${isProcessing ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' :
                                consultation.status === 'signed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm' : 'bg-amber-50 text-amber-700 border border-amber-100 shadow-sm'
                                }`}>
                                <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-blue-500 animate-pulse' : consultation.status === 'signed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                {isProcessing ? 'PROCESSANDO IA' : consultation.status === 'signed' ? 'CONCLUÍDO & ASSINADO' : 'REVISÃO PENDENTE'}
                            </span>
                        </div>

                        <div className="h-10 w-[1px] bg-gray-100 mx-1" />

                        <div className="flex gap-3">
                            <button
                                onClick={() => handleSave('draft')}
                                disabled={isProcessing || isSaving || consultation.status === 'signed'}
                                className="px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                Salvar Rascunho
                            </button>
                            <button
                                onClick={() => handleSave('signed')}
                                disabled={isProcessing || isSaving || consultation.status === 'signed'}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[20px]">verified_user</span>
                                Assinar agora
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Column: Transcript / Dialogue */}
                <div className="w-1/3 border-r overflow-y-auto p-4 bg-white">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">description</span>
                        {consultation.aiProntuario?.dialogo ? 'Diálogo da Consulta' : 'Transcrição'}
                    </h3>

                    {isProcessing ? (
                        <div className="animate-pulse space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                            <p className="text-sm text-gray-400 mt-4 text-center">A IA está transcrevendo o áudio...</p>
                        </div>
                    ) : consultation.aiProntuario?.dialogo && Array.isArray(consultation.aiProntuario.dialogo) ? (
                        <div className="space-y-3">
                            {consultation.aiProntuario.dialogo.map((item: any, index: number) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-lg border-l-3 ${item.falante?.toUpperCase() === 'MÉDICA' || item.falante?.toUpperCase() === 'MEDICA'
                                        ? 'bg-blue-50 border-l-4 border-blue-500'
                                        : 'bg-purple-50 border-l-4 border-purple-500'
                                        }`}
                                >
                                    <div className={`text-xs font-semibold mb-1 ${item.falante?.toUpperCase() === 'MÉDICA' || item.falante?.toUpperCase() === 'MEDICA'
                                        ? 'text-blue-700'
                                        : 'text-purple-700'
                                        }`}>
                                        {item.falante || 'Desconhecido'}
                                    </div>
                                    <div className="text-sm text-gray-800 leading-relaxed">
                                        {item.texto}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {consultation.cleanTranscript || consultation.rawTranscript || "Nenhuma transcrição disponível."}
                        </div>
                    )}
                </div>

                {/* Right Column: AI Prontuario (Form) */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">vital_signs</span>
                        Prontuário Sugerido
                    </h3>

                    {isProcessing ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <span className="material-symbols-outlined animate-spin text-3xl mb-2">progress_activity</span>
                            <p>Analisando dados clínicos...</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-2xl mx-auto">
                            {editedProntuario && typeof editedProntuario === 'object' ? (
                                Object.entries(editedProntuario)
                                    .filter(([key]) => key !== 'memorias' && key !== 'dialogo')
                                    .map(([key, value]) => {
                                        const label = key.replace(/_/g, ' ');

                                        // ── Nested object with sub-arrays (e.g. antecedentes) ──
                                        const isNestedObjectWithArrays =
                                            typeof value === 'object' &&
                                            value !== null &&
                                            !Array.isArray(value) &&
                                            Object.values(value as Record<string, any>).some(Array.isArray);

                                        if (isNestedObjectWithArrays) {
                                            const sectionMeta: Record<string, { icon: string; color: string; label: string }> = {
                                                doencas:     { icon: 'medical_information', color: 'bg-red-50 text-red-700 border-red-200',    label: 'Doenças' },
                                                alergias:    { icon: 'warning',             color: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Alergias' },
                                                cirurgias:   { icon: 'operating_room',      color: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Cirurgias' },
                                                medicamentos:{ icon: 'medication',           color: 'bg-blue-50 text-blue-700 border-blue-200',   label: 'Medicamentos' },
                                            };

                                            return (
                                                <div key={key} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">
                                                        {label}
                                                    </label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {Object.entries(value as Record<string, any>).map(([subKey, subVal]) => {
                                                            const meta = sectionMeta[subKey] || {
                                                                icon: 'info', color: 'bg-gray-50 text-gray-700 border-gray-200', label: subKey
                                                            };
                                                            const items: string[] = Array.isArray(subVal) ? subVal : [String(subVal)];
                                                            const displayVal = items.join('\n');
                                                            
                                                            return (
                                                                <div key={subKey} className={`p-3 rounded-lg border ${meta.color.split(' ')[0]} border-opacity-50`} style={{ borderColor: 'currentColor', borderWidth: 1 }}>
                                                                    <div className={`flex items-center gap-1.5 mb-2 ${meta.color.split(' ').slice(1).join(' ')}`}>
                                                                        <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                                                                        <span className="text-xs font-semibold uppercase tracking-wide">{meta.label}</span>
                                                                    </div>
                                                                    <textarea
                                                                        value={displayVal}
                                                                        placeholder="Digite um por linha..."
                                                                        onChange={(e) => {
                                                                            const newLines = e.target.value.split('\n').filter(line => line.trim() !== '');
                                                                            setEditedProntuario({
                                                                                ...editedProntuario,
                                                                                [key]: {
                                                                                    ...(editedProntuario[key] as object),
                                                                                    [subKey]: newLines
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="w-full text-sm text-gray-800 border-0 focus:ring-0 p-0 resize-none bg-transparent placeholder:text-gray-300 min-h-[60px]"
                                                                        rows={Math.max(2, items.length)}
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // ── Array of primitives ──
                                        if (Array.isArray(value)) {
                                            const items = value.map((v: any) =>
                                                typeof v === 'object' ? JSON.stringify(v) : String(v)
                                            );
                                            const displayVal = items.join('\n');

                                            return (
                                                <div key={key} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">{label}</label>
                                                    <textarea
                                                        value={displayVal}
                                                        placeholder="Digite um por linha..."
                                                        onChange={(e) => {
                                                            const newLines = e.target.value.split('\n').filter(line => line.trim() !== '');
                                                            setEditedProntuario({
                                                                ...editedProntuario,
                                                                [key]: newLines
                                                            });
                                                        }}
                                                        className="w-full text-sm text-gray-800 border-0 focus:ring-0 p-0 resize-none bg-transparent placeholder:text-gray-300 min-h-[40px]"
                                                        rows={Math.max(2, items.length)}
                                                    />
                                                </div>
                                            );
                                        }

                                        // ── Primitive (string, number) ──
                                        const displayValue = String(value ?? '');
                                        return (
                                            <div key={key} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all group">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="h-2 w-2 rounded-full bg-blue-400 group-focus-within:bg-blue-600 transition-colors" />
                                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
                                                </div>
                                                <textarea
                                                    value={displayValue}
                                                    onChange={(e) => setEditedProntuario({ ...editedProntuario, [key]: e.target.value })}
                                                    className="w-full text-[15px] text-gray-800 border-0 focus:ring-0 p-0 resize-none bg-transparent leading-relaxed placeholder:text-gray-300"
                                                    placeholder={`Descreva ${label.toLowerCase()}...`}
                                                    rows={Math.max(2, Math.ceil(displayValue.length / 50))}
                                                />
                                            </div>
                                        );
                                    })
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    Nenhum dado estruturado gerado.
                                </div>
                            )}

                            {/* Memories Section */}
                            {editedProntuario?.memorias && Array.isArray(editedProntuario.memorias) && editedProntuario.memorias.length > 0 && (
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">
                                        Memórias do Paciente
                                    </label>
                                    <div className="space-y-2">
                                        {editedProntuario.memorias.map((m: any, i: number) => {
                                            const typeColors: Record<string, string> = {
                                                preferencia: 'bg-green-100 text-green-700',
                                                restricao: 'bg-red-100 text-red-700',
                                                alergia: 'bg-orange-100 text-orange-700',
                                                historico: 'bg-blue-100 text-blue-700',
                                                observacao: 'bg-gray-100 text-gray-700',
                                            };
                                            const color = typeColors[m.type] || typeColors.observacao;
                                            return (
                                                <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-gray-50">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${color}`}>
                                                        {m.type || 'obs'}
                                                    </span>
                                                    <div className="text-sm text-gray-700">
                                                        <p>{m.description}</p>
                                                        {m.suggestion && (
                                                            <p className="text-xs text-gray-400 mt-0.5 italic">💡 {m.suggestion}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {consultation.aiResumo && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h4 className="text-sm font-semibold text-blue-800 mb-2">Resumo da IA</h4>
                                    <p className="text-sm text-blue-900 leading-relaxed">
                                        {consultation.aiResumo}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
