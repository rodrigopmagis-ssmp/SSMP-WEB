import React, { useState, useEffect } from 'react';
import { useScheduleBlocks, CreateScheduleBlockData } from '../../hooks/useScheduleBlocks';
import { useBusinessHours } from '../../hooks/useBusinessHours';
import { AgendaService, Appointment } from '../../services/AgendaService';
import { format, addDays, addMinutes, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
    isEmbedded?: boolean;
    onEditAppointment?: (appt: Appointment) => void;
    onViewAppointment?: (appt: Appointment) => void;
}

const ScheduleBlockModal: React.FC<ScheduleBlockModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    clinicId,
    professionals,
    initialDate,
    editingBlock,
    isEmbedded,
    onEditAppointment,
    onViewAppointment
}) => {
    const { createScheduleBlock, updateScheduleBlock, deleteScheduleBlock } = useScheduleBlocks(clinicId);
    const { getBusinessHoursForDate } = useBusinessHours(clinicId);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean } | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [conflicts, setConflicts] = useState<Appointment[]>([]);
    const [showConflictModal, setShowConflictModal] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        selectedProfessionals: [] as string[],
        isClinicWide: false,
        observations: '',
        date: initialDate || new Date().toISOString().split('T')[0],
        endDate: initialDate || new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '18:00',
        isFullDay: false,
        isPeriod: false
    });

    useEffect(() => {
        if (editingBlock) {
            setFormData({
                title: editingBlock.reason || '',
                selectedProfessionals: editingBlock.professional_id ? [editingBlock.professional_id] : [],
                isClinicWide: editingBlock.is_clinic_wide,
                observations: editingBlock.reason || '',
                date: editingBlock.date,
                endDate: editingBlock.date,
                startTime: editingBlock.start_time?.slice(0, 5) || '09:00',
                endTime: editingBlock.end_time?.slice(0, 5) || '18:00',
                isFullDay: editingBlock.is_full_day,
                isPeriod: false
            });
        } else if (initialDate) {
            setFormData(prev => ({ ...prev, date: initialDate, endDate: initialDate }));
        }
    }, [editingBlock, initialDate]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

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

    const handleStartTimeChange = (newStartTime: string) => {
        if (!newStartTime) {
            setFormData(prev => ({ ...prev, startTime: newStartTime }));
            return;
        }

        try {
            // Parse HH:mm
            const [hours, minutes] = newStartTime.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            
            const endDate = addMinutes(date, 30);
            const newEndTime = format(endDate, 'HH:mm');
            
            setFormData(prev => ({ 
                ...prev, 
                startTime: newStartTime,
                endTime: newEndTime
            }));
        } catch (err) {
            setFormData(prev => ({ ...prev, startTime: newStartTime }));
        }
    };

    const handleSave = async (force: boolean = false) => {
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

            const startTimeStr = formData.isFullDay ? '00:00:00' : `${formData.startTime}:00`;
            const endTimeStr = formData.isFullDay ? '23:59:59' : `${formData.endTime}:00`;
            const startDate = new Date(`${formData.date}T${startTimeStr}`);
            const endDate = new Date(`${formData.date}T${endTimeStr}`);

            // Verificar conflitos se não for um salvamento forçado
            if (!force) {
                let allConflicts: Appointment[] = [];
                
                const datesToCheck = [];
                if (formData.isPeriod) {
                    let current = parseISO(formData.date);
                    const end = parseISO(formData.endDate);
                    while (isBefore(current, end) || isEqual(current, end)) {
                        datesToCheck.push(format(current, 'yyyy-MM-dd'));
                        current = addDays(current, 1);
                    }
                } else {
                    datesToCheck.push(formData.date);
                }

                for (const d of datesToCheck) {
                    const dStart = new Date(`${d}T${startTimeStr}`);
                    const dEnd = new Date(`${d}T${endTimeStr}`);
                    
                    if (formData.isClinicWide) {
                        const appts = await AgendaService.getAppointmentsOverlapping(dStart, dEnd);
                        allConflicts = [...allConflicts, ...appts];
                    } else {
                        for (const profId of formData.selectedProfessionals) {
                            const appts = await AgendaService.getAppointmentsOverlapping(dStart, dEnd, profId);
                            allConflicts = [...allConflicts, ...appts];
                        }
                    }
                }

                if (allConflicts.length > 0) {
                    // Remover duplicatas
                    const uniqueConflicts = allConflicts.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
                    setConflicts(uniqueConflicts);
                    setShowConflictModal(true);
                    setSaving(false);
                    return;
                }
            }

            const blockData: CreateScheduleBlockData = {
                date: formData.date,
                start_time: formData.isFullDay ? null : `${formData.startTime}:00`,
                end_time: formData.isFullDay ? null : `${formData.endTime}:00`,
                is_clinic_wide: formData.isClinicWide,
                is_full_day: formData.isFullDay,
                reason: formData.title,
                professional_id: formData.isClinicWide ? null : (formData.selectedProfessionals[0] || null)
            };

            if (editingBlock) {
                // Update existing block
                await updateScheduleBlock(editingBlock.id, blockData);
                setToast({ message: 'Bloqueio atualizado com sucesso!', type: 'success', visible: true });
            } else {
                // Create new blocks
                const datesToBlock = [];
                if (formData.isPeriod) {
                    let current = parseISO(formData.date);
                    const end = parseISO(formData.endDate);
                    
                    while (isBefore(current, end) || isEqual(current, end)) {
                        datesToBlock.push(format(current, 'yyyy-MM-dd'));
                        current = addDays(current, 1);
                    }
                } else {
                    datesToBlock.push(formData.date);
                }

                for (const date of datesToBlock) {
                    const currentBlockData = { ...blockData, date };
                    
                    if (formData.isClinicWide) {
                        await createScheduleBlock(currentBlockData);
                    } else {
                        for (const professionalId of formData.selectedProfessionals) {
                            await createScheduleBlock({
                                ...currentBlockData,
                                professional_id: professionalId
                            });
                        }
                    }
                }
                
                const successMsg = datesToBlock.length > 1 
                    ? `Bloqueio de ${datesToBlock.length} dias criado com sucesso!`
                    : 'Bloqueio criado com sucesso!';
                setToast({ message: successMsg, type: 'success', visible: true });
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

    const content = (
        <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isEmbedded ? 'shadow-none rounded-none max-h-none' : ''}`}>
            {/* Header */}
            {!isEmbedded && (
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
            )}

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
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Data e Horário</h3>
                                {!editingBlock && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormData({ ...formData, isPeriod: !formData.isPeriod })}
                                            type="button"
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.isPeriod ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${formData.isPeriod ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Bloquear período</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className={formData.isPeriod ? "grid grid-cols-2 gap-3" : ""}>
                                    <div>
                                        <label htmlFor="block-date" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            {formData.isPeriod ? 'Data Início*' : 'Data*'}
                                        </label>
                                        <input
                                            id="block-date"
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                date: e.target.value,
                                                endDate: !formData.isPeriod || isAfter(parseISO(formData.endDate), parseISO(e.target.value)) ? formData.endDate : e.target.value
                                            })}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-purple-500 outline-none text-sm"
                                        />
                                    </div>
                                    {formData.isPeriod && (
                                        <div>
                                            <label htmlFor="block-end-date" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                Data Fim*
                                            </label>
                                            <input
                                                id="block-end-date"
                                                type="date"
                                                value={formData.endDate}
                                                min={formData.date}
                                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-purple-500 outline-none text-sm"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="block-start-time" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            Início*
                                        </label>
                                        <input
                                            id="block-start-time"
                                            type="time"
                                            value={formData.startTime}
                                            onChange={(e) => handleStartTimeChange(e.target.value)}
                                            disabled={formData.isFullDay}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-purple-500 outline-none disabled:opacity-50 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="block-end-time" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                            Fim*
                                        </label>
                                        <input
                                            id="block-end-time"
                                            type="time"
                                            value={formData.endTime}
                                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                            disabled={formData.isFullDay}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-purple-500 outline-none disabled:opacity-50 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Dia inteiro toggle */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setFormData({ ...formData, isFullDay: !formData.isFullDay })}
                                    type="button"
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.isFullDay ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${formData.isFullDay ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                                <span className="text-xs text-gray-700 dark:text-gray-300">Dia inteiro</span>
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
                                onClick={() => handleSave()}
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
    );

    return (
        <>
            {toast && toast.visible && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
            {isEmbedded ? content : (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    {content}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowDeleteConfirm(false)}
                        />
                        {/* Dialog card */}
                        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4 border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
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

            {/* Conflict Warning Dialog */}
            {showConflictModal && (
                <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowConflictModal(false)}
                    />
                    {/* Dialog card */}
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5 border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl text-amber-600 dark:text-amber-400">warning</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Pacientes agendados detectados</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Existem agendamentos no período selecionado para este bloqueio.
                                </p>
                            </div>
                        </div>

                        {/* List of conflicts */}
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                            {conflicts.map(appt => (
                                <div key={appt.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{appt.patient?.name}</span>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Profissional: {appt.professional?.full_name}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase">
                                                {format(new Date(appt.start_time), 'HH:mm')}
                                            </span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => onViewAppointment?.(appt)}
                                                    title="Visualizar agendamento"
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                </button>
                                                <button
                                                    onClick={() => onEditAppointment?.(appt)}
                                                    title="Editar agendamento"
                                                    className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                            O profissional atenderá mesmo com o bloqueio ou os pacientes devem ser remanejados?
                        </p>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setShowConflictModal(false)}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    setShowConflictModal(false);
                                    handleSave(true);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm shadow-amber-200 dark:shadow-amber-900/30 transition-all"
                            >
                                <span className="material-symbols-outlined text-base">check_circle</span>
                                Confirmar Bloqueio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ScheduleBlockModal;
