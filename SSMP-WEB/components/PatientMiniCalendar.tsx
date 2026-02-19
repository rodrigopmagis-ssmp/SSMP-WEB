import React, { useState, useEffect, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendaService, Appointment } from '../src/services/AgendaService';
import { supabaseService } from '../src/services/supabaseService';
import { UserProfile, Procedure, Patient } from '../types';
import Toast from './ui/Toast';
import AppointmentModal from './AppointmentModal';

interface PatientMiniCalendarProps {
    patientId: string;
    patientName: string;
    onUpdate?: () => void;
}

const PatientMiniCalendar: React.FC<PatientMiniCalendarProps> = ({ patientId, patientName, onUpdate }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);

    // Popup State
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const [processingAction, setProcessingAction] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ initialDate?: Date; initialEvent?: any }>({});

    // Data for Modal
    const [professionals, setProfessionals] = useState<UserProfile[]>([]);
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]); // Need this for the modal prop even if pre-selected

    // Fetch data for modal
    const [clinicId, setClinicId] = useState<string | null>(null);

    useEffect(() => {
        const loadClinicId = async () => {
            try {
                const { data: { user } } = await supabaseService.getUser();
                if (user) {
                    // Assuming profile has clinic_id, or fetch from profiles table
                    const { data: profile } = await supabaseService.getProfile(user.id);
                    if (profile) setClinicId(profile.clinic_id);
                }
            } catch (error) {
                console.error('Error loading clinic ID:', error);
            }
        };
        loadClinicId();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const loadedProfessionals = await AgendaService.getProfessionals() as unknown as UserProfile[];
                setProfessionals(loadedProfessionals);

                const loadedProcedures = await supabaseService.getProcedures();
                setProcedures(loadedProcedures);

                // We need patients list for the modal, even if we only show current patient
                const loadedPatients = await supabaseService.getPatients();
                setPatients(loadedPatients);

            } catch (error) {
                console.error("Error fetching data for mini calendar modal:", error);
            }
        };
        fetchData();
    }, []);

    // Fetch appointments
    useEffect(() => {
        const fetchAppointments = async () => {
            setLoading(true);
            try {
                const data = await AgendaService.getAppointmentsByPatient(patientId);
                setAppointments(data || []);
            } catch (error) {
                console.error('Error fetching patient appointments:', error);
            } finally {
                setLoading(false);
            }
        };

        if (patientId) {
            fetchAppointments();
        }
    }, [patientId]);

    // Close popup on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setSelectedDate(null);
                setSelectedAppointment(null);
            }
        };

        if (selectedDate) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [selectedDate]);

    // Calendar logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const firstDayOfWeek = monthStart.getDay();
    const calendarDays = Array(firstDayOfWeek).fill(null).concat(daysInMonth);
    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    // Action handlers
    const handleStatusChange = async (status: 'scheduled' | 'cancelled' | 'completed') => {
        if (!selectedAppointment) return;
        setProcessingAction(true);
        try {
            await AgendaService.updateAppointment(selectedAppointment.id, { status });
            setToast({ message: `Agendamento ${status === 'completed' ? 'concluído' : status === 'cancelled' ? 'cancelado' : 'atualizado'} com sucesso!`, type: 'success' });

            // Refresh local list
            const updatedAppointments = appointments.map(app =>
                app.id === selectedAppointment.id ? { ...app, status } : app
            );
            setAppointments(updatedAppointments);
            setSelectedAppointment(null);
            setSelectedDate(null);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error updating status:', error);
            setToast({ message: 'Erro ao atualizar status.', type: 'error' });
        } finally {
            setProcessingAction(false);
        }
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const getDayStatusParams = (day: Date) => {
        const dayApps = appointments.filter(app => {
            // Handle both ISO strings and Date objects just in case, though DB returns ISO strings
            const appDate = typeof app.start_time === 'string' ? parseISO(app.start_time) : app.start_time;
            return isSameDay(appDate, day) && app.status !== 'cancelled';
        });

        if (dayApps.length === 0) return null;

        // Prioritize specific statuses if multiple
        const hasScheduled = dayApps.some(a => a.status === 'scheduled');
        const hasCompleted = dayApps.some(a => a.status === 'completed');

        return {
            hasAppointment: true,
            status: hasScheduled ? 'scheduled' : (hasCompleted ? 'completed' : 'other'),
            appointment: dayApps[0]
        };
    };

    const handleDateClick = (day: Date, event: React.MouseEvent<HTMLButtonElement>, app?: Appointment) => {
        // Prepare data for AppointmentModal
        if (app) {
            // Editing existing
            setSelectedAppointment(app);
            // Convert to event-like object for modal
            const eventMock = {
                resource: {
                    id: app.id,
                    patient_id: app.patient_id,
                    professional_id: app.professional_id,
                    procedure_id: app.procedure_id,
                    notes: app.description,
                    status: app.status
                },
                start: new Date(app.start_time),
                end: new Date(app.end_time)
            };
            setModalData({ initialEvent: eventMock });
        } else {
            // Creating new
            setSelectedAppointment(null);
            setModalData({ initialDate: day });
        }
        setIsModalOpen(true);
    };

    // Find next appointment for highlight
    const nextAppointment = appointments
        .filter(a => a.status === 'scheduled' && isAfter(parseISO(a.start_time), new Date()))
        .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())[0];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 relative">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </h3>
                <button onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day, index) => (
                    <div key={index} className="text-center text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                    if (!day) return <div key={`empty-${index}`} className="aspect-square" />;

                    const dayStatus = getDayStatusParams(day);
                    const isTodayDate = isToday(day);
                    const isNextApp = nextAppointment && isSameDay(parseISO(nextAppointment.start_time), day);

                    let bgClass = "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300";
                    let ringClass = "";

                    if (dayStatus) {
                        if (dayStatus.status === 'scheduled') {
                            bgClass = "bg-primary/10 text-primary font-bold hover:bg-primary/20";
                        } else if (dayStatus.status === 'completed') {
                            bgClass = "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold";
                        }
                    }

                    if (isTodayDate) {
                        ringClass = "ring-1 ring-primary ring-inset";
                    }

                    if (isNextApp) {
                        ringClass = "ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-gray-800 z-10";
                    }

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={(e) => handleDateClick(day, e, dayStatus?.appointment)}
                            className={`
                                aspect-square rounded-lg text-xs flex flex-col items-center justify-center relative transition-all
                                ${bgClass}
                                ${ringClass}
                                ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}
                            `}
                        >
                            <span>{format(day, 'd')}</span>
                            {dayStatus && (
                                <span className={`w-1 h-1 rounded-full mt-0.5 ${dayStatus.status === 'scheduled' ? 'bg-primary' : 'bg-green-500'}`}></span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-primary/20 border border-primary"></span>
                    <span>Agendado</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-green-100 border border-green-500"></span>
                    <span>Realizado</span>
                </div>
                {nextAppointment && (
                    <div className="mt-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-2 text-xs">
                        <p className="font-semibold text-amber-800 dark:text-amber-400 mb-0.5">Próxima Visita:</p>
                        <p className="text-gray-700 dark:text-gray-300">
                            {format(parseISO(nextAppointment.start_time), "dd 'de' MMMM", { locale: ptBR })} às {format(parseISO(nextAppointment.start_time), 'HH:mm')}
                        </p>
                    </div>
                )}
            </div>

            {/* Appointment Modal */}
            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    // Refresh appointments
                    const fetchAppointments = async () => {
                        try {
                            const data = await AgendaService.getAppointmentsByPatient(patientId);
                            setAppointments(data || []);
                            if (onUpdate) onUpdate();
                        } catch (error) {
                            console.error('Error refreshing appointments:', error);
                        }
                    };
                    fetchAppointments();
                    setToast({ message: 'Agendamento salvo com sucesso!', type: 'success' });
                }}
                patients={patients}
                procedures={procedures}
                professionals={professionals}
                initialDate={modalData.initialDate}
                initialEvent={modalData.initialEvent}
                clinicId={clinicId}
                isPatientFixed={true}
                defaultPatientId={patientId}
            />

        </div>
    );
};


export default PatientMiniCalendar;
