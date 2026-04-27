import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { AgendaService } from '../src/services/AgendaService';
import { Patient, Procedure, UserProfile } from '../types';
import { addMinutes, format, parseISO, isSameDay, isWithinInterval } from 'date-fns';
import { useScheduleBlocks, ScheduleBlock } from '../src/hooks/useScheduleBlocks';
import { useBusinessHours } from '../src/hooks/useBusinessHours';
import { useHolidays } from '../src/hooks/useHolidays';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patients: Patient[];
    procedures: Procedure[];
    professionals: UserProfile[];
    initialDate?: Date;
    initialEvent?: any; // For editing
    clinicId?: string | null;
    isPatientFixed?: boolean;
    defaultPatientId?: string;
    isEmbedded?: boolean;
    isReadOnly?: boolean;
    defaultProfessionalId?: string;
}

const CancelOptionsModal = ({ isOpen, onClose, onReschedule, onCancel }: { isOpen: boolean, onClose: () => void, onReschedule: () => void, onCancel: () => void }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">calendar_clock</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Deseja reagendar?</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Você está cancelando este agendamento. Gostaria de agendar um novo horário para este paciente?
                    </p>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={onReschedule}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                        >
                            Sim, Reagendar
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                            Não, Apenas Cancelar
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ExceptionModal = ({ isOpen, warnings, onClose, onConfirm }: { isOpen: boolean, warnings: string[], onClose: () => void, onConfirm: () => void }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
                        <span className="material-symbols-outlined text-3xl">info</span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirmação de Agendamento</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Deseja realmente confirmar este agendamento com as seguintes observações?
                    </p>
                    <ul className="list-disc list-inside space-y-1 mb-6 text-sm text-gray-600 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                        {warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                        ))}
                    </ul>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Alterar Data
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
                        >
                            Confirmar Agendamento
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, loading }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, loading: boolean }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                        <span className="material-symbols-outlined text-3xl">delete_forever</span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Excluir Agendamento</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Tem certeza que deseja excluir permanentemente este agendamento? Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="animate-spin material-symbols-outlined text-lg">sync</span>
                            ) : (
                                <span className="material-symbols-outlined text-lg">delete</span>
                            )}
                            Sim, Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RetroactiveModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: () => void }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
                        <span className="material-symbols-outlined text-3xl">history</span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ajuste de Agenda</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        A data selecionada é inferior à data/hora atual e não é permitida para novos agendamentos.
                        <br /><br />
                        Deseja realizar um <strong>ajuste de agenda</strong> e lançar este agendamento como <strong>Concluído</strong>?
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Não, Corrigir Data
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            Sim, Lançar como Concluído
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AppointmentModal: React.FC<AppointmentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    patients,
    procedures,
    professionals,
    initialDate,
    initialEvent,
    clinicId,
    isPatientFixed,
    defaultPatientId,
    isEmbedded,
    isReadOnly,
    defaultProfessionalId
}) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        patient_id: '',
        professional_id: '',
        procedure_id: '', // Optional, stored in metadata or separate column if needed
        start_time: '',
        end_time: '',
        notes: '',
        status: 'scheduled' as 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled',
    });

    const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
    const [pendingWarnings, setPendingWarnings] = useState<string[]>([]);

    // New States for Reschedule Flow
    const [showCancelOptions, setShowCancelOptions] = useState(false);
    const [isRescheduleMode, setIsRescheduleMode] = useState(false);

    // Retroactive Validation State
    const [isRetroactiveModalOpen, setIsRetroactiveModalOpen] = useState(false);

    // Track if an immediate operation (like cancellation) has been completed
    const [isOperationComplete, setIsOperationComplete] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Patient Search State
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const filteredPatients = useMemo(() => {
        if (!patientSearchTerm) return patients;
        return patients.filter(p => p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()));
    }, [patients, patientSearchTerm]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsPatientDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const { scheduleBlocks, loading: loadingBlocks, refetch: fetchScheduleBlocks } = useScheduleBlocks(clinicId || undefined);
    const { getBusinessHoursForDate, refetch: refetchBusinessHours } = useBusinessHours(clinicId || undefined);
    const { isHoliday, holidays } = useHolidays(clinicId || undefined);

    // Fetch blocks and business hours when modal opens or date changes
    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        if (!newStart) {
            setFormData(prev => ({ ...prev, start_time: newStart }));
            return;
        }

        try {
            const startDate = new Date(newStart);
            const endDate = addMinutes(startDate, 30);
            
            setFormData(prev => ({ 
                ...prev, 
                start_time: newStart,
                end_time: format(endDate, "yyyy-MM-dd'T'HH:mm")
            }));
        } catch (err) {
            setFormData(prev => ({ ...prev, start_time: newStart }));
        }
    };

    const startDateStr = useMemo(() => {
        if (!formData.start_time) return undefined;
        return formData.start_time.split('T')[0];
    }, [formData.start_time]);

    useEffect(() => {
        if (isOpen && clinicId) {
            refetchBusinessHours(); // Refresh business hours to get latest settings
            const dateStr = startDateStr || (initialDate ? format(initialDate, 'yyyy-MM-dd') : undefined);
            if (dateStr) fetchScheduleBlocks(dateStr, dateStr); // Fetch for the specific day
        }
    }, [isOpen, clinicId, startDateStr]);

    // Reset states when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setIsRescheduleMode(false);
            setShowCancelOptions(false);
            setIsOperationComplete(false);
        }
    }, [isOpen]);

    const validateAppointment = (): string[] => {
        if (!formData.start_time || !formData.end_time) return [];

        const start = new Date(formData.start_time);
        const end = new Date(formData.end_time);
        const dateStr = format(start, 'yyyy-MM-dd');
        const startTimeStr = format(start, 'HH:mm');
        const endTimeStr = format(end, 'HH:mm');

        const warnings: string[] = [];

        // 1. Check for Holiday
        if (isHoliday(start)) {
            const holiday = holidays.find(h => h.date === dateStr);
            warnings.push(`Feriado: ${holiday?.description || 'Data festiva'}`);
        }

        // 2. Check Business Hours
        const timeRanges = getBusinessHoursForDate(start);
        if (timeRanges.length === 0) {
            warnings.push('Fora do horário de funcionamento (Dia fechado)');
        } else {
            const withinRange = timeRanges.some(range => {
                return startTimeStr >= range.start.substring(0, 5) && endTimeStr <= range.end.substring(0, 5);
            });

            if (!withinRange) {
                const hoursText = timeRanges.map(r => `${r.start.substring(0, 5)} - ${r.end.substring(0, 5)}`).join(', ');
                warnings.push(`Fora do horário de funcionamento (${hoursText})`);
            }
        }

        // 3. Check Schedule Blocks
        if (scheduleBlocks.length > 0) {
            const conflictingBlock = scheduleBlocks.find(block => {

                if (block.date !== dateStr) return false;

                const isClinicWide = block.is_clinic_wide;
                const isTargetProfessional = block.professional_id === formData.professional_id;

                if (!isClinicWide && !isTargetProfessional && block.professional_id) return false;

                if (block.is_full_day) {
                    return true;
                }

                if (block.start_time && block.end_time) {
                    const blockStart = block.start_time.substring(0, 5);
                    const blockEnd = block.end_time.substring(0, 5);
                    return (startTimeStr < blockEnd && endTimeStr > blockStart);
                }
                return false;
            });

            if (conflictingBlock) {
                warnings.push(`Bloqueio de agenda: ${conflictingBlock.reason || 'Sem motivo'}`);
            }
        }

        return warnings;
    };

    const saveAppointment = async (warnings: string[] = [], reason: string = '') => {
        try {
            setLoading(true);
            const selectedPatient = patients.find(p => p.id === formData.patient_id);
            const selectedProcedure = procedures.find(p => p.id === formData.procedure_id);

            // If rescheduling, use specific title or default
            let title = selectedProcedure
                ? `${selectedProcedure.name} - ${selectedPatient?.name}`
                : `Atendimento - ${selectedPatient?.name}`;

            if (isRescheduleMode) {
                title = `Reagendamento: ${title}`;
            }

            let description = formData.notes;
            if (warnings.length > 0 && reason) {
                description += `\n[Exceção Aprovada: ${warnings.join('. ')}. Motivo: ${reason}]`;
            }

            const appointmentData = {
                patient_id: formData.patient_id,
                professional_id: formData.professional_id,
                procedure_id: formData.procedure_id || undefined,
                title: title,
                description: description,
                start_time: new Date(formData.start_time),
                end_time: new Date(formData.end_time),
                status: isRescheduleMode ? 'scheduled' : formData.status, // New appointment starts as scheduled
                type: selectedProcedure?.name || 'Consulta'
            };

            if (isRescheduleMode && initialEvent?.resource?.id) {
                // Perform Reschedule
                await AgendaService.rescheduleAppointment(initialEvent.resource.id, appointmentData as any);
                toast.success('Agendamento reagendado com sucesso!');
            } else if (initialEvent?.resource?.id) {
                // Update existing
                await AgendaService.updateAppointment(initialEvent.resource.id, appointmentData);
                toast.success('Agendamento atualizado!');
            } else {
                // Create new
                await AgendaService.createAppointment(appointmentData);
                toast.success('Agendamento criado!');
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving appointment:', error);
            toast.error(`Erro ao salvar agendamento: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
            setIsExceptionModalOpen(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (loadingBlocks) {
            toast('Verificando disponibilidade da agenda...', { icon: '⏳' });
            return;
        }

        // 1. Required fields
        if (!formData.patient_id || !formData.professional_id || !formData.start_time || !formData.end_time) {
            toast.error('Preencha os campos obrigatórios');
            return;
        }

        // If explicitly cancelling (and NOT rescheduling), skip all validations
        if (formData.status === 'cancelled' && !isRescheduleMode) {
            await saveAppointment();
            return;
        }

        // 2. Double Booking Check (hard block) - CHECK THIS FIRST
        try {
            const currentAppointmentId = initialEvent?.resource?.id;
            const { professionalConflict, patientConflict } = await AgendaService.checkAvailability(
                new Date(formData.start_time),
                new Date(formData.end_time),
                formData.professional_id,
                formData.patient_id,
                currentAppointmentId
            );

            if (professionalConflict) {
                const conflictStart = format(new Date(professionalConflict.start_time), 'HH:mm');
                const conflictEnd = format(new Date(professionalConflict.end_time), 'HH:mm');
                toast.error(`Conflito: O profissional já tem um agendamento das ${conflictStart} às ${conflictEnd}.`, { duration: 5000 });
                return;
            }

            if (patientConflict) {
                const conflictStart = format(new Date(patientConflict.start_time), 'HH:mm');
                const conflictEnd = format(new Date(patientConflict.end_time), 'HH:mm');
                toast.error(`Conflito: O paciente já tem um agendamento das ${conflictStart} às ${conflictEnd}.`, { duration: 5000 });
                return;
            }
        } catch (err: any) {
            console.error('Error checking availability:', err);
            toast.error('Erro ao verificar disponibilidade. Tente novamente.');
            return;
        }

        // 3. Retroactive Check
        const start = new Date(formData.start_time);
        const now = new Date();
        if (start < now && formData.status !== 'completed' && formData.status !== 'cancelled' && formData.status !== 'no_show') {
            setIsRetroactiveModalOpen(true);
            return;
        }

        // 4. Schedule Block & Business Hours warnings
        const warnings = validateAppointment();

        if (warnings.length > 0) {
            setPendingWarnings(warnings);
            setIsExceptionModalOpen(true);
        } else {
            await saveAppointment();
        }
    };

    const handleConfirmException = () => {
        saveAppointment(pendingWarnings, '');
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as any;

        if (newStatus === 'cancelled') {
            // Trigger Cancel Flow
            setShowCancelOptions(true);
            // Don't update state yet, wait for modal choice
        } else if (newStatus === 'rescheduled') {
            // Treat user selecting 'rescheduled' as "I want to reschedule"
            setIsRescheduleMode(true);
            setFormData(prev => ({ ...prev, status: 'scheduled' })); // Reset status for the NEW appointment
            toast('Modo Reagendamento Ativado: Selecione o novo horário.', { icon: '📅' });
        } else {
            setFormData(prev => ({ ...prev, status: newStatus }));
        }
    };

    const handleConfirmCancel = () => {
        setShowCancelOptions(false);
        // Save immediately as requested
        saveWithStatus('cancelled', false);
    };

    const handleConfirmReschedule = () => {
        setIsRescheduleMode(true);
        setFormData(prev => ({ ...prev, status: 'scheduled' })); // The NEW appointment is scheduled
        setShowCancelOptions(false);
        toast('Modo Reagendamento: Selecione a nova data e horário.', { icon: '🔄' });
    };

    const handleDelete = async () => {
        if (!initialEvent?.resource?.id) return;

        try {
            setLoading(true);
            await AgendaService.deleteAppointment(initialEvent.resource.id);
            toast.success('Agendamento excluído com sucesso!');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error deleting appointment:', error);
            toast.error(`Erro ao excluir agendamento: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleConfirmRetroactive = () => {
        // Set status to completed and save immediately
        // We need to pass the status override to saveAppointment because setState is async
        // Actually, let's update state and call save, but we need to handle the state update first.
        // A cleaner way is to pass an override to saveAppointment or update state and rely on useEffect/callback? 
        // No, simplest is to pass overrides or update state and then call a function that uses the *latest* data?
        // But saveAppointment uses `formData` from state.

        // Let's update the formData state, close modal, and then trigger save
        setFormData(prev => ({ ...prev, status: 'completed' }));
        setIsRetroactiveModalOpen(false);

        // Use a tricky timeout to allow state to settle, OR change saveAppointment to accept data override.
        // Since we already have a closure issue if we just call it, modifying saveAppointment to accept optional override is best.
        // For now, let's use the timeout pattern which is effectively what React batching might require if we don't refactor.
        // BETTER: Refactor saveAppointment to take optional status override.
        // BUT for minimal changes:
        setTimeout(() => {
            // We need to bypass the retroactive check this time, OR just call saveAppointment directly.
            // But saveAppointment uses `formData`. 
            // We can just rely on the fact that status is now 'completed' in the state.
            // But we need to call `saveAppointment` *after* the state update is reflected.
            // Actually, `saveAppointment` reads from `formData`. If we call it in setTimeout(..., 0), it *should* see the new state if it's a fresh closure or ref.
            // Wait, `saveAppointment` is a closure over `formData` at the time of render? YES.
            // So `saveAppointment` inside the component will see the *current render's* `formData`.
            // We need `useEffect` or `useRef` to handle this robustly without refactoring the whole function.
            // ALTHOUGH: `setFormData` triggers a re-render. We can use a `useEffect` to trigger save? No, that's messy.

            // ALTERNATIVE: Call a version of save that accepts overrides.
            saveWithStatus('completed');
        }, 0);
    };

    const saveWithStatus = async (statusOverride: any, shouldClose: boolean = true) => {
        // Double Check availability even in retroactive/override flows
        try {
            const currentAppointmentId = initialEvent?.resource?.id;
            const { professionalConflict, patientConflict } = await AgendaService.checkAvailability(
                new Date(formData.start_time),
                new Date(formData.end_time),
                formData.professional_id,
                formData.patient_id,
                currentAppointmentId
            );

            if (professionalConflict) {
                const conflictStart = format(new Date(professionalConflict.start_time), 'HH:mm');
                const conflictEnd = format(new Date(professionalConflict.end_time), 'HH:mm');
                toast.error(`Conflito: O profissional já tem um agendamento das ${conflictStart} às ${conflictEnd}.`);
                return;
            }

            if (patientConflict) {
                const conflictStart = format(new Date(patientConflict.start_time), 'HH:mm');
                const conflictEnd = format(new Date(patientConflict.end_time), 'HH:mm');
                toast.error(`Conflito: O paciente já tem um agendamento das ${conflictStart} às ${conflictEnd}.`);
                return;
            }
        } catch (err) {
            console.error('Error checking availability in override flow:', err);
        }

        try {
            setLoading(true);
            const selectedPatient = patients.find(p => p.id === formData.patient_id);
            const selectedProcedure = procedures.find(p => p.id === formData.procedure_id);

            let title = selectedProcedure
                ? `${selectedProcedure.name} - ${selectedPatient?.name}`
                : `Atendimento - ${selectedPatient?.name}`;

            if (isRescheduleMode) {
                title = `Reagendamento: ${title}`;
            }

            const appointmentData = {
                patient_id: formData.patient_id,
                professional_id: formData.professional_id,
                procedure_id: formData.procedure_id || undefined,
                title: title,
                description: formData.notes,
                start_time: new Date(formData.start_time),
                end_time: new Date(formData.end_time),
                status: statusOverride, // FORCE COMPLETED
                type: selectedProcedure?.name || 'Consulta'
            };

            if (isRescheduleMode && initialEvent?.resource?.id) {
                await AgendaService.rescheduleAppointment(initialEvent.resource.id, appointmentData as any);
                toast.success('Agendamento reagendado com sucesso!');
            } else if (initialEvent?.resource?.id) {
                await AgendaService.updateAppointment(initialEvent.resource.id, appointmentData);
                toast.success('Agendamento atualizado!');
            } else {
                await AgendaService.createAppointment(appointmentData as any);
                toast.success('Agendamento criado!');
            }

            setFormData(prev => ({ ...prev, status: statusOverride }));

            onSuccess();
            if (shouldClose) {
                onClose();
            } else {
                setIsOperationComplete(true);
            }
        } catch (error: any) {
            console.error('Error saving appointment:', error);
            toast.error(`Erro ao salvar agendamento: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
            setIsRetroactiveModalOpen(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setIsPatientDropdownOpen(false); // Reset dropdown state
            if (initialEvent) {
                // Editing mode
                setFormData({
                    patient_id: initialEvent.resource.patient_id,
                    professional_id: initialEvent.resource.professional_id,
                    procedure_id: initialEvent.resource.procedure_id || '',
                    start_time: format(new Date(initialEvent.start), "yyyy-MM-dd'T'HH:mm"),
                    end_time: format(new Date(initialEvent.end), "yyyy-MM-dd'T'HH:mm"),
                    notes: initialEvent.resource.notes || '',
                    status: initialEvent.resource.status || 'scheduled',
                });
                // Set initial search term
                const p = patients.find(p => p.id === initialEvent.resource.patient_id);
                setPatientSearchTerm(p ? p.name : '');
            } else if (initialDate) {
                // Create mode with pre-selected date
                const start = initialDate;
                const end = addMinutes(start, 30); // Default 30 min duration
                setFormData({
                    patient_id: defaultPatientId || '',
                    professional_id: defaultProfessionalId || '',
                    procedure_id: '',
                    start_time: format(start, "yyyy-MM-dd'T'HH:mm"),
                    end_time: format(end, "yyyy-MM-dd'T'HH:mm"),
                    notes: '',
                    status: 'scheduled',
                });
                if (defaultPatientId) {
                    const p = patients.find(p => p.id === defaultPatientId);
                    setPatientSearchTerm(p ? p.name : '');
                } else {
                    setPatientSearchTerm('');
                }
            } else if (defaultPatientId) {
                setFormData(prev => ({ ...prev, patient_id: defaultPatientId }));
                const p = patients.find(p => p.id === defaultPatientId);
                setPatientSearchTerm(p ? p.name : '');
            } else {
                setPatientSearchTerm('');
            }
        }
    }, [isOpen, initialEvent, initialDate, defaultPatientId, patients]);

    const statusColors: any = {
        scheduled: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        confirmed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
        completed: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
        cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
        no_show: 'bg-gray-800 text-white border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-800',
        rescheduled: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800', // New color
    };

    const statusLabels: any = {
        scheduled: 'Agendado',
        confirmed: 'Confirmado',
        completed: 'Concluído',
        cancelled: 'Cancelado',
        no_show: 'Não Compareceu',
        rescheduled: 'Reagendado' // New Label
    };

    if (!isOpen) return null;

    const content = (
        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] ${isRescheduleMode ? 'ring-2 ring-primary ring-offset-2' : ''} ${isEmbedded ? 'shadow-none rounded-none max-h-none h-full' : ''}`}>
            {!isEmbedded && (
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            {isRescheduleMode ? (
                                <>
                                    <span className="material-symbols-outlined text-primary">update</span>
                                    Reagendamento
                                </>
                            ) : (
                                initialEvent ? 'Editar Agendamento' : 'Novo Agendamento'
                            )}
                        </h2>
                        {isRescheduleMode && (
                            <p className="text-xs text-primary mt-1 font-medium">Selecione o novo horário para este paciente</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            )}

                    <div className="overflow-y-auto p-6 space-y-4 flex-grow">
                        {/* Status Selector - Prominent at Top */}
                        {initialEvent && !isRescheduleMode && (
                            <div className="flex items-center gap-3 mb-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                <label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300">Status Atual:</label>
                                <select
                                    id="status"
                                    value={formData.status}
                                    onChange={handleStatusChange}
                                    disabled={isReadOnly}
                                    className={`flex-1 p-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary ${statusColors[formData.status]} ${isReadOnly ? 'cursor-not-allowed opacity-80' : ''}`}
                                >
                                    {Object.entries(statusLabels).map(([value, label]) => (
                                        <option key={value} value={value} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">
                                            {label as string}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {isRescheduleMode && (
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">info</span>
                                O agendamento original será marcado como "Reagendado".
                            </div>
                        )}

                        <form id="appointment-form" onSubmit={handleSubmit} className="space-y-4">
                            {/* Patient Searchable Select */}
                            <div className="relative" ref={searchContainerRef}>
                                <label htmlFor="patient_search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Paciente *
                                </label>
                                <div className="relative">
                                    <input
                                        id="patient_search"
                                        type="text"
                                        value={patientSearchTerm}
                                        onChange={(e) => {
                                            setPatientSearchTerm(e.target.value);
                                            setIsPatientDropdownOpen(true);
                                            // Handle clearing ID if user deletes text or types something new
                                            // But only clear if the text doesn't match the currently selected patient's name
                                            // Actually, simplest UX: if they type, they are searching. 
                                            // We can optimistically unset the ID and wait for selection, OR keep the ID but it might be inconsistent.
                                            // Let's unset ID if they change the text effectively.
                                            if (e.target.value === '') {
                                                setFormData(prev => ({ ...prev, patient_id: '' }));
                                            }
                                        }}
                                        onFocus={() => setIsPatientDropdownOpen(true)}
                                        onClick={() => setIsPatientDropdownOpen(true)}
                                        placeholder="Digite para buscar paciente..."
                                        className={`w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${(isPatientFixed || isReadOnly) ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-80' : ''}`}
                                        disabled={isPatientFixed || isReadOnly}
                                        autoComplete="off"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <span className="material-symbols-outlined text-gray-400">search</span>
                                    </div>

                                    {/* Dropdown Results */}
                                    {isPatientDropdownOpen && !isPatientFixed && (
                                        <ul className="absolute z-[70] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto focus:outline-none animate-in fade-in zoom-in-95 duration-100">
                                            {filteredPatients.length > 0 ? (
                                                filteredPatients.map(p => (
                                                    <li
                                                        key={p.id}
                                                        className="text-gray-900 dark:text-white cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, patient_id: p.id }));
                                                            setPatientSearchTerm(p.name);
                                                            setIsPatientDropdownOpen(false);
                                                        }}
                                                    >
                                                        <div className="flex items-center">
                                                            <span className="font-medium block truncate">
                                                                {p.name}
                                                            </span>
                                                        </div>
                                                        {formData.patient_id === p.id && (
                                                            <span className="text-primary absolute inset-y-0 right-0 flex items-center pr-4">
                                                                <span className="material-symbols-outlined text-sm">check</span>
                                                            </span>
                                                        )}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="text-gray-500 dark:text-gray-400 cursor-default select-none py-2 pl-3 pr-9 text-center text-sm">
                                                    Nenhum paciente encontrado
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Professional Select */}
                            <div>
                                <label htmlFor="professional_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Profissional *
                                </label>
                                <select
                                    id="professional_id"
                                    value={formData.professional_id}
                                    onChange={(e) => setFormData({ ...formData, professional_id: e.target.value })}
                                    className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${isReadOnly ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-80' : ''}`}
                                    required
                                    disabled={isReadOnly}
                                >
                                    <option value="">Selecione um profissional</option>
                                    {professionals.map(p => (
                                        <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Procedure Select (Optional) */}
                            <div>
                                <label htmlFor="procedure_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Procedimento (Opcional)
                                </label>
                                <select
                                    id="procedure_id"
                                    value={formData.procedure_id}
                                    onChange={(e) => setFormData({ ...formData, procedure_id: e.target.value })}
                                    className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${isReadOnly ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-80' : ''}`}
                                    disabled={isReadOnly}
                                >
                                    <option value="">Selecione um procedimento</option>
                                    {procedures.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date and Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Início *
                                    </label>
                                    <input
                                        id="start_time"
                                        type="datetime-local"
                                        value={formData.start_time}
                                        onChange={handleStartTimeChange}
                                        className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${isReadOnly ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-80' : ''}`}
                                        required
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Fim *
                                    </label>
                                    <input
                                        id="end_time"
                                        type="datetime-local"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                        className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${isReadOnly ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-80' : ''}`}
                                        required
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Observações
                                </label>
                                <textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${isReadOnly ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-80' : ''}`}
                                    rows={3}
                                    placeholder="Detalhes adicionais..."
                                    disabled={isReadOnly}
                                />
                            </div>

                        </form>
                    </div>

                    <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end items-center gap-3 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                        {initialEvent && !isReadOnly && (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="mr-auto px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                                disabled={loading}
                            >
                                <span className="material-symbols-outlined text-lg">delete</span>
                                Excluir
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        {!isReadOnly ? (
                            <button
                                form="appointment-form"
                                type="submit"
                                disabled={loading || isOperationComplete}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                        {isRescheduleMode ? 'Reagendando...' : 'Salvando...'}
                                    </>
                                ) : (
                                    isRescheduleMode ? 'Confirmar Reagendamento' : (initialEvent ? 'Salvar Alterações' : 'Criar Agendamento')
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">check</span>
                                OK
                            </button>
                        )}
                    </div>
            </div>
    );

    return (
        <>
            {isEmbedded ? content : (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    {content}
                </div>
            )}

            {/* Exception Validation Modal */}
            <ExceptionModal
                isOpen={isExceptionModalOpen}
                warnings={pendingWarnings}
                onClose={() => setIsExceptionModalOpen(false)}
                onConfirm={handleConfirmException}
            />

            {/* Cancel Options Modal */}
            <CancelOptionsModal
                isOpen={showCancelOptions}
                onClose={() => setShowCancelOptions(false)}
                onReschedule={handleConfirmReschedule}
                onCancel={handleConfirmCancel}
            />

            {/* Retroactive Confirmation Modal */}
            <RetroactiveModal
                isOpen={isRetroactiveModalOpen}
                onClose={() => setIsRetroactiveModalOpen(false)}
                onConfirm={handleConfirmRetroactive}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                loading={loading}
            />
        </>
    );
};

export default AppointmentModal;
