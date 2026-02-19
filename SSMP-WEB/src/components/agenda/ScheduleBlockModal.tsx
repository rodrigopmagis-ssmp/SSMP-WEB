import React, { useState, useEffect } from 'react';
import { useScheduleBlocks, CreateScheduleBlockData } from '../../hooks/useScheduleBlocks';
import { useBusinessHours } from '../../hooks/useBusinessHours';
import Toast from '../../../components/ui/Toast';

interface ScheduleBlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    clinicId: string;
    professionals: Array<{ id: string; name: string }>;
    initialDate?: string;
    editingBlock?: {
        id: string;
        professional_id: string | null;
        date: string;
        start_time: string | null;
        end_time: string | null;
        is_clinic_wide: boolean;
        is_full_day: boolean;
        reason: string | null;
    };
}

const ScheduleBlockModal: React.FC<ScheduleBlockModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    clinicId,
    professionals,
    initialDate,
    editingBlock
}) => {
    const { createScheduleBlock, updateScheduleBlock, deleteScheduleBlock } = useScheduleBlocks(clinicId);
    const { getBusinessHoursForDate } = useBusinessHours(clinicId);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean } | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        selectedProfessionals: [] as string[],
        isClinicWide: false,
        observations: '',
        date: initialDate || new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '18:00',
        isFullDay: false
    });

    useEffect(() => {
        if (editingBlock) {
            setFormData({
                title: editingBlock.reason || '',
                selectedProfessionals: editingBlock.professional_id ? [editingBlock.professional_id] : [],
                isClinicWide: editingBlock.is_clinic_wide,
                observations: editingBlock.reason || '',
                date: editingBlock.date,
                startTime: editingBlock.start_time?.slice(0, 5) || '09:00',
                endTime: editingBlock.end_time?.slice(0, 5) || '18:00',
                isFullDay: editingBlock.is_full_day
            });
        } else if (initialDate) {
            setFormData(prev => ({ ...prev, date: initialDate }));
        }
    }, [editingBlock, initialDate]);

    // Update times when full day is toggled or date changes
    useEffect(() => {
        if (formData.isFullDay && formData.date) {
            const date = new Date(formData.date + 'T00:00:00');
            const businessHours = getBusinessHoursForDate(date);

            if (businessHours.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    startTime: businessHours[0].start,
                    endTime: businessHours[businessHours.length - 1].end
                }));
            }
        }
    }, [formData.isFullDay, formData.date, getBusinessHoursForDate]);

    const handleProfessionalToggle = (professionalId: string) => {
        if (formData.isClinicWide) {
            setToast({
                message: 'Para marcar um profissional específico, desabilite a opção "Clínica toda"',
                type: 'error',
                visible: true
            });
            return;
        }

        setFormData(prev => ({
            ...prev,
            selectedProfessionals: prev.selectedProfessionals.includes(professionalId)
                ? prev.selectedProfessionals.filter(id => id !== professionalId)
                : [...prev.selectedProfessionals, professionalId]
        }));
    };

    const handleClinicWideToggle = () => {
        setFormData(prev => ({
            ...prev,
            isClinicWide: !prev.isClinicWide,
            selectedProfessionals: !prev.isClinicWide ? [] : prev.selectedProfessionals
        }));
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            setToast({ message: 'Preencha o título do bloqueio', type: 'error', visible: true });
            return;
        }

        if (!formData.isClinicWide && formData.selectedProfessionals.length === 0) {
            setToast({ message: 'Selecione pelo menos um profissional ou marque "Clínica toda"', type: 'error', visible: true });
            return;
        }

        try {
            setSaving(true);

            const blockData: CreateScheduleBlockData = {
                date: formData.date,
                start_time: formData.isFullDay ? null : `${formData.startTime}:00`,
                end_time: formData.isFullDay ? null : `${formData.endTime}:00`,
                is_clinic_wide: formData.isClinicWide,
                is_full_day: formData.isFullDay,
                reason: formData.title
            };

            if (editingBlock) {
                // Update existing block
                await updateScheduleBlock(editingBlock.id, blockData);
                setToast({ message: 'Bloqueio atualizado com sucesso!', type: 'success', visible: true });
            } else {
                // Create new blocks (one for each professional if not clinic-wide)
                if (formData.isClinicWide) {
                    await createScheduleBlock(blockData);
                } else {
                    for (const professionalId of formData.selectedProfessionals) {
                        await createScheduleBlock({
                            ...blockData,
                            professional_id: professionalId
                        });
                    }
                }
                setToast({ message: 'Bloqueio criado com sucesso!', type: 'success', visible: true });
            }

            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 1000);
        } catch (error) {
            setToast({ message: 'Erro ao salvar bloqueio', type: 'error', visible: true });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!editingBlock) return;
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!editingBlock) return;
        setShowDeleteConfirm(false);
        try {
            setDeleting(true);
            await deleteScheduleBlock(editingBlock.id);
            setToast({ message: 'Bloqueio removido com sucesso!', type: 'success', visible: true });
            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 1000);
        } catch (error) {
            setToast({ message: 'Erro ao remover bloqueio', type: 'error', visible: true });
        } finally {
            setDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                {toast && toast.visible && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}

                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {editingBlock ? 'Editar Bloqueio de Horário' : 'Bloqueio de Horário'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <span className="material-symbols-outlined text-gray-500">close</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Dados Básicos */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Dados básicos</h3>

                            <div className="space-y-4">
                                {/* Título */}
                                <div>
                                    <label htmlFor="block-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Título*
                                    </label>
                                    <input
                                        id="block-title"
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Bloqueio de horário"
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-purple-500 outline-none"
                                    />
                                </div>

                                {/* Profissionais */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Profissionais
                                    </label>
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="flex-1">
                                            {formData.isClinicWide ? (
                                                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 text-sm">
                                                    [Todos profissionais]
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {formData.selectedProfessionals.length > 0 ? (
                                                        formData.selectedProfessionals.map(profId => {
                                                            const prof = professionals.find(p => p.id === profId);
                                                            return prof ? (
                                                                <div
                                                                    key={profId}
                                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                                                                >
                                                                    {prof.name}
                                                                    <button
                                                                        onClick={() => handleProfessionalToggle(profId)}
                                                                        className="hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-full p-0.5"
                                                                    >
                                                                        <span className="material-symbols-outlined text-xs">close</span>
                                                                    </button>
                                                                </div>
                                                            ) : null;
                                                        })
                                                    ) : (
                                                        <select
                                                            aria-label="Selecione um profissional"
                                                            onChange={(e) => {
                                                                if (e.target.value) {
                                                                    handleProfessionalToggle(e.target.value);
                                                                    e.target.value = '';
                                                                }
                                                            }}
                                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-purple-500 outline-none"
                                                        >
                                                            <option value="">Selecione um profissional</option>
                                                            {professionals.map(prof => (
                                                                <option key={prof.id} value={prof.id}>{prof.name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Clínica toda toggle */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleClinicWideToggle}
                                                type="button"
                                                aria-label={formData.isClinicWide ? "Desativar clínica toda" : "Ativar clínica toda"}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isClinicWide ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isClinicWide ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Clínica toda</span>
                                        </div>
                                    </div>

                                    {/* Professional selector when not clinic-wide and has selections */}
                                    {!formData.isClinicWide && formData.selectedProfessionals.length > 0 && (
                                        <select
                                            aria-label="Adicionar outro profissional"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleProfessionalToggle(e.target.value);
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-purple-500 outline-none text-sm"
                                        >
                                            <option value="">+ Adicionar outro profissional</option>
                                            {professionals
                                                .filter(prof => !formData.selectedProfessionals.includes(prof.id))
                                                .map(prof => (
                                                    <option key={prof.id} value={prof.id}>{prof.name}</option>
                                                ))}
                                        </select>
                                    )}
                                </div>

                                {/* Observações */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Observações
                                    </label>
                                    <textarea
                                        value={formData.observations}
                                        onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                                        placeholder="Digite aqui..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-purple-500 outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Data */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Data</h3>

                            <div className="grid grid-cols-3 gap-4">
                                {/* Dia */}
                                <div>
                                    <label htmlFor="block-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Dia*
                                    </label>
                                    <input
                                        id="block-date"
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-purple-500 outline-none"
                                    />
                                </div>

                                {/* Início */}
                                <div>
                                    <label htmlFor="block-start-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Início*
                                    </label>
                                    <input
                                        id="block-start-time"
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        disabled={formData.isFullDay}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-purple-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Fim */}
                                <div>
                                    <label htmlFor="block-end-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Fim*
                                    </label>
                                    <input
                                        id="block-end-time"
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        disabled={formData.isFullDay}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-purple-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {/* Dia inteiro toggle */}
                            <div className="flex items-center gap-2 mt-4">
                                <button
                                    onClick={() => setFormData({ ...formData, isFullDay: !formData.isFullDay })}
                                    type="button"
                                    aria-label={formData.isFullDay ? "Desativar dia inteiro" : "Ativar dia inteiro"}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isFullDay ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isFullDay ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                                <span className="text-sm text-gray-700 dark:text-gray-300">Dia inteiro</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between gap-3">
                        <div>
                            {editingBlock && (
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {deleting
                                        ? <span className="material-symbols-outlined animate-spin text-base">sync</span>
                                        : <span className="material-symbols-outlined text-base">delete</span>
                                    }
                                    Excluir bloqueio
                                </button>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-7 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg shadow-sm shadow-red-200 dark:shadow-red-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving
                                    ? <span className="material-symbols-outlined animate-spin text-base">sync</span>
                                    : <span className="material-symbols-outlined text-base">save</span>
                                }
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowDeleteConfirm(false)}
                        />
                        {/* Dialog card */}
                        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4 border border-gray-100 dark:border-gray-800">
                            {/* Warning icon */}
                            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">warning</span>
                            </div>

                            <div className="text-center">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Excluir bloqueio?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Esta ação não pode ser desfeita. O bloqueio de horário será removido permanentemente.
                                </p>
                            </div>

                            <div className="flex gap-3 w-full mt-1">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg shadow-sm shadow-red-200 dark:shadow-red-900/30 transition-all"
                                >
                                    <span className="material-symbols-outlined text-base">delete</span>
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default ScheduleBlockModal;
