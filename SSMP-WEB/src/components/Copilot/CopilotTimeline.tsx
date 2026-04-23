import React, { useState, useEffect } from 'react';
import { useConsultationStatus } from '../../hooks/useConsultationStatus';
import { Consultation } from '../../../types';
import { supabaseService } from '../../services/supabaseService';
import { toast } from 'react-hot-toast';

interface CopilotTimelineProps {
    consultationId: string;
    onClose?: () => void;
}

export const CopilotTimeline: React.FC<CopilotTimelineProps> = ({ consultationId, onClose }) => {
    const { consultation, isLoading, error } = useConsultationStatus(consultationId);
    const [editedProntuario, setEditedProntuario] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (consultation?.aiProntuario) {
            // DEBUG: Verificar estrutura dos dados
            console.log('🔍 DEBUG - Consultation:', consultation);
            console.log('🔍 DEBUG - aiProntuario:', consultation.aiProntuario);
            console.log('🔍 DEBUG - dialogo:', consultation.aiProntuario?.dialogo);
            console.log('🔍 DEBUG - dialogo is array?', Array.isArray(consultation.aiProntuario?.dialogo));

            setEditedProntuario(consultation.aiProntuario);
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

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">vital_signs</span>
                    <h2 className="font-semibold text-gray-800">Revisão de Consulta IA</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isProcessing ? 'bg-blue-100 text-blue-700' :
                        consultation.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                        {isProcessing ? 'Processando...' : consultation.status === 'signed' ? 'Assinado' : 'Revisão Pendente'}
                    </span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleSave('draft')}
                        disabled={isProcessing || isSaving || consultation.status === 'signed'}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                    >
                        Salvar Rascunho
                    </button>
                    <button
                        onClick={() => handleSave('signed')}
                        disabled={isProcessing || isSaving || consultation.status === 'signed'}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Assinar Prontuário
                    </button>
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
                                                            return (
                                                                <div key={subKey} className={`p-3 rounded-lg border ${meta.color.split(' ')[0]} border-opacity-50`} style={{ borderColor: 'currentColor', borderWidth: 1 }}>
                                                                    <div className={`flex items-center gap-1.5 mb-2 ${meta.color.split(' ').slice(1).join(' ')}`}>
                                                                        <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                                                                        <span className="text-xs font-semibold uppercase tracking-wide">{meta.label}</span>
                                                                    </div>
                                                                    {items.length === 0 ? (
                                                                        <p className="text-xs text-gray-400 italic">Nenhum registro</p>
                                                                    ) : (
                                                                        <ul className="space-y-1">
                                                                            {items.map((item, i) => (
                                                                                <li key={i} className="flex items-start gap-1.5 text-sm text-gray-800">
                                                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                                                                                    {item}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
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
                                            return (
                                                <div key={key} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">{label}</label>
                                                    {items.length === 0 ? (
                                                        <p className="text-xs text-gray-400 italic">Nenhum registro</p>
                                                    ) : (
                                                        <ul className="space-y-1">
                                                            {items.map((item, i) => (
                                                                <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                                                                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                                                    {item}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            );
                                        }

                                        // ── Primitive (string, number) ──
                                        const displayValue = String(value ?? '');
                                        return (
                                            <div key={key} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
                                                <textarea
                                                    value={displayValue}
                                                    onChange={(e) => setEditedProntuario({ ...editedProntuario, [key]: e.target.value })}
                                                    className="w-full text-sm text-gray-800 border-0 focus:ring-0 p-0 resize-none bg-transparent"
                                                    rows={Math.max(2, displayValue.length / 60)}
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
