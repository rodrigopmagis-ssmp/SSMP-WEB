import React, { useState } from 'react';
import { ComplaintResolutionStatus } from '../../types';
import { toast } from 'react-hot-toast';

interface ComplaintClosureModalProps {
    isOpen: boolean;
    onClose: () => void;
    complaintId: string;
    hasContacts: boolean;
    onConfirm: (resolutionStatus: ComplaintResolutionStatus, resolutionReason: string) => Promise<void>;
}

interface ResolutionOption {
    value: ComplaintResolutionStatus;
    label: string;
    description: string;
    icon: string;
    color: string;
}

const RESOLUTION_OPTIONS: ResolutionOption[] = [
    {
        value: 'resolvida',
        label: 'Resolvida',
        description: 'Problema solucionado conforme protocolo. Não há pendências internas.',
        icon: 'check_circle',
        color: 'text-green-600'
    },
    {
        value: 'resolvida_acompanhamento',
        label: 'Resolvida com Acompanhamento',
        description: 'Caso tecnicamente resolvido com retorno agendado ou monitoramento.',
        icon: 'schedule',
        color: 'text-blue-600'
    },
    {
        value: 'nao_procedente',
        label: 'Não Procedente',
        description: 'Não foi identificada falha técnica. Conduta correta comprovada.',
        icon: 'cancel',
        color: 'text-gray-600'
    },
    {
        value: 'parcialmente_resolvida',
        label: 'Parcialmente Resolvida',
        description: 'Parte do problema foi solucionada. Ainda há limitação técnica ou clínica.',
        icon: 'pending',
        color: 'text-yellow-600'
    },
    {
        value: 'nao_resolvida',
        label: 'Não Resolvida',
        description: 'Não foi possível atender a demanda. Limitação técnica, clínica ou legal.',
        icon: 'block',
        color: 'text-red-600'
    },
    {
        value: 'encerrada_inatividade',
        label: 'Encerrada por Inatividade',
        description: 'Não houve continuidade interna. Caso perdeu objeto.',
        icon: 'timer_off',
        color: 'text-gray-500'
    },
    {
        value: 'cancelada_duplicada',
        label: 'Cancelada / Duplicada',
        description: 'Registro indevido ou reclamação duplicada.',
        icon: 'content_copy',
        color: 'text-orange-600'
    },
    {
        value: 'encerrada_acordo',
        label: 'Encerrada por Acordo',
        description: 'Houve acordo financeiro/comercial (estorno, cortesia, retratamento).',
        icon: 'handshake',
        color: 'text-indigo-600'
    },
    {
        value: 'encerrada_juridico',
        label: 'Encerrada com Escalonamento Jurídico',
        description: 'Caso transferido para jurídico. Potencial ou início de ação judicial.',
        icon: 'gavel',
        color: 'text-purple-600'
    }
];

const ComplaintClosureModal: React.FC<ComplaintClosureModalProps> = ({
    isOpen,
    onClose,
    complaintId,
    hasContacts,
    onConfirm
}) => {
    const [selectedStatus, setSelectedStatus] = useState<ComplaintResolutionStatus | ''>('');
    const [resolutionReason, setResolutionReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const selectedOption = RESOLUTION_OPTIONS.find(opt => opt.value === selectedStatus);

    const handleSubmit = async () => {
        // Validações
        if (!selectedStatus) {
            toast.error('Selecione um status de resolução.');
            return;
        }

        if (!resolutionReason.trim()) {
            toast.error('O motivo do encerramento é obrigatório.');
            return;
        }

        if (!hasContacts) {
            toast.error('É necessário registrar pelo menos 1 contato antes de encerrar a reclamação.');
            return;
        }

        setShowConfirmation(true);
    };

    const handleConfirmClosure = async () => {
        if (!selectedStatus) return;

        try {
            setIsLoading(true);
            await onConfirm(selectedStatus, resolutionReason);
            toast.success('Reclamação encerrada com sucesso!');
            handleClose();
        } catch (error: any) {
            console.error('Error closing complaint:', error);
            toast.error(error.message || 'Erro ao encerrar reclamação.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedStatus('');
        setResolutionReason('');
        setShowConfirmation(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#2d181e] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-primary/20">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-[#2d181e] border-b border-gray-200 dark:border-primary/10 p-6 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Encerrar Reclamação</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {!hasContacts && '⚠️ Atenção: Nenhum contato registrado ainda'}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {!showConfirmation ? (
                    <>
                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Warning */}
                            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">warning</span>
                                    <div>
                                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Atenção</p>
                                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                                            Esta ação é irreversível. Certifique-se de que todos os contatos necessários foram registrados.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Validation: No Contacts */}
                            {!hasContacts && (
                                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
                                        <div>
                                            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Bloqueio de Encerramento</p>
                                            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                                                É obrigatório registrar pelo menos 1 contato com o paciente antes de encerrar a reclamação.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Status Selection */}
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                                    Status Final <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value as ComplaintResolutionStatus)}
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a0f12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                    aria-label="Selecionar status de resolução"
                                >
                                    <option value="">Selecione o status final...</option>
                                    {RESOLUTION_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Selected Status Description */}
                            {selectedOption && (
                                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <span className={`material-symbols-outlined ${selectedOption.color}`}>
                                            {selectedOption.icon}
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                                                {selectedOption.label}
                                            </p>
                                            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                                {selectedOption.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Resolution Reason */}
                            <div>
                                <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                                    Motivo do Encerramento <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={resolutionReason}
                                    onChange={(e) => setResolutionReason(e.target.value)}
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a0f12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                    rows={5}
                                    placeholder="Descreva detalhadamente o motivo do encerramento, ações tomadas e resultado final..."
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Mínimo recomendado: 10 caracteres. Atual: {resolutionReason.length}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 dark:border-primary/10 flex justify-end gap-3">
                            <button
                                onClick={handleClose}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedStatus || resolutionReason.trim().length < 10 || !hasContacts}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">lock</span>
                                Confirmar Encerramento
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Confirmation Screen */}
                        <div className="p-6 space-y-6">
                            <div className="text-center py-8">
                                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-4xl">warning</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    Confirmar Encerramento?
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Esta ação não pode ser desfeita.
                                </p>
                            </div>

                            {/* Summary */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Status Final</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                        {selectedOption?.label}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Motivo</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                                        {resolutionReason}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Confirmation Footer */}
                        <div className="p-6 border-t border-gray-200 dark:border-primary/10 flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                disabled={isLoading}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleConfirmClosure}
                                disabled={isLoading}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        Encerrando...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Sim, Encerrar Agora
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ComplaintClosureModal;
