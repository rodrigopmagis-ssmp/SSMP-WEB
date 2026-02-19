import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { AgendaService, Appointment } from '../services/AgendaService';
import AppointmentModal from '../../components/AppointmentModal';
import { Patient, Procedure } from '../../types';
import AgendaEvent from '../../components/AgendaEvent';
import MiniCalendar from '../../components/MiniCalendar';
import ScheduleBlockModal from '../components/agenda/ScheduleBlockModal';
import AgendaReport from '../components/agenda/AgendaReport';
import CustomAgenda from '../components/agenda/CustomAgenda';
import ProfessionalExtractModal from '../components/agenda/ProfessionalExtractModal';
import { supabase } from '../lib/supabase';
import { useHolidays } from '../hooks/useHolidays';
import { useBusinessHours } from '../hooks/useBusinessHours';
import { useScheduleBlocks } from '../hooks/useScheduleBlocks';

// Setup localizer with pt-BR
const locales = { 'pt-BR': ptBR };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
    getDay,
    locales,
});

// PT-BR messages for react-big-calendar
const messages = {
    allDay: 'Dia inteiro',
    previous: 'Anterior',
    next: 'Próximo',
    today: 'Hoje',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Nenhum evento neste período.',
    showMore: (total: number) => `+ ${total} mais`,
};

interface AgendaProps {
    patients: Patient[];
    procedures: Procedure[];
}

// Warning Modal Component
interface WarningModalProps {
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const WarningModal: React.FC<WarningModalProps> = ({ isOpen, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">warning</span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Atenção</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                    >
                        Continuar mesmo assim
                    </button>
                </div>
            </div>
        </div>
    );
};

const Agenda: React.FC<AgendaProps> = ({ patients, procedures }) => {
    const [events, setEvents] = useState<any[]>([]);
    const [view, setView] = useState<View>(Views.WEEK);
    const [date, setDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [professionals, setProfessionals] = useState<any[]>([]);
    const [selectedProfessional, setSelectedProfessional] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
    const [clinicId, setClinicId] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<Date | undefined>(undefined);
    const [selectedEvent, setSelectedEvent] = useState<any | undefined>(undefined);

    // Schedule Block Modal State
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState<any | undefined>(undefined);

    // Report Modal State
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isExtractOpen, setIsExtractOpen] = useState(false);

    // Warning Modal State
    const [warningModal, setWarningModal] = useState<{
        isOpen: boolean;
        message: string;
        pendingSlot?: Date;
    }>({ isOpen: false, message: '' });

    // Hooks
    const { holidays } = useHolidays(clinicId || undefined);
    const { businessHours } = useBusinessHours(clinicId || undefined);
    const { scheduleBlocks, refetch: refetchBlocks } = useScheduleBlocks(clinicId || undefined);

    // Load data
    useEffect(() => {
        fetchAppointments();
        loadProfessionals();
        loadClinicId();
    }, [date, view, selectedProfessional]);

    const loadClinicId = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('clinic_id')
                    .eq('id', user.id)
                    .single();
                if (profile) setClinicId(profile.clinic_id);
            }
        } catch (error) {
            console.error('Error loading clinic ID:', error);
        }
    };

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const start = new Date(date.getFullYear(), date.getMonth(), 1);
            const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            const data = await AgendaService.getAppointments(start, end, selectedProfessional);
            const calendarEvents = data.map(appt => ({
                id: appt.id,
                title: `${appt.patient?.name || 'Paciente'} - ${appt.type || 'Consulta'}`,
                start: new Date(appt.start_time),
                end: new Date(appt.end_time),
                resource: appt,
                type: 'appointment',
            }));
            setEvents(calendarEvents);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadProfessionals = async () => {
        try {
            const pros = await AgendaService.getProfessionals();
            setProfessionals(pros || []);
        } catch (error) {
            console.error(error);
        }
    };

    // Build holiday events to display on calendar
    const holidayEvents = holidays.map(h => {
        const [year, month, day] = h.date.split('-').map(Number);
        const holidayDate = new Date(year, month - 1, day);
        const endDate = new Date(year, month - 1, day + 1);
        return {
            id: `holiday-${h.id}`,
            title: `🎉 ${h.description}`,
            start: holidayDate,
            end: endDate,
            allDay: true,
            resource: h,
            type: 'holiday',
        };
    });

    // Build schedule block events to display on calendar
    const blockEvents = scheduleBlocks.flatMap(block => {
        const [year, month, day] = block.date.split('-').map(Number);
        const baseDate = new Date(year, month - 1, day);
        const label = `🚫 ${block.reason || 'Bloqueio'}`;

        if (block.is_full_day || !block.start_time || !block.end_time) {
            // Full-day block: single all-day event
            return [{
                id: `block-${block.id}`,
                title: label,
                start: baseDate,
                end: new Date(year, month - 1, day + 1),
                allDay: true,
                resource: block,
                type: 'block',
            }];
        }

        // Partial block: banner (all-day) + timed event in the grid
        const [sh, sm] = block.start_time.split(':').map(Number);
        const [eh, em] = block.end_time.split(':').map(Number);
        const start = new Date(year, month - 1, day, sh, sm);
        const end = new Date(year, month - 1, day, eh, em);

        return [
            // 1. All-day banner at the top of the day column
            {
                id: `block-banner-${block.id}`,
                title: `🚫 ${block.start_time?.slice(0, 5)}–${block.end_time?.slice(0, 5)} ${block.reason || 'Bloqueio'}`,
                start: baseDate,
                end: new Date(year, month - 1, day + 1),
                allDay: true,
                resource: block,
                type: 'block-banner',
            },
            // 2. Timed event spanning the blocked hours
            {
                id: `block-${block.id}`,
                title: label,
                start,
                end,
                allDay: false,
                resource: block,
                type: 'block',
            },
        ];
    });


    const allEvents = [...events, ...holidayEvents, ...blockEvents].filter(event => {
        // Filter by Status
        if (selectedStatus !== 'Todos') {
            if (event.type === 'appointment') {
                const status = event.resource.status || 'Agendado';
                const statusMap: Record<string, string> = {
                    'Agendado': 'scheduled',
                    'Realizado': 'completed',
                    'Cancelado': 'cancelled',
                    'Confirmado': 'confirmed',
                    'Não compareceu': 'no_show'
                };

                const selectedStatusKey = statusMap[selectedStatus] || selectedStatus;
                // Check if the event status matches the selected status (handling both key and label)
                if (status !== selectedStatusKey && status !== selectedStatus) return false;
            } else {
                return false; // Hide blocks/holidays if filtering by specific status
            }
        }

        // Filter by Professional
        if (selectedProfessional !== 'all') {
            if (event.type === 'appointment') {
                if (event.resource.professional_id !== selectedProfessional) return false;
            } else if (event.type === 'block' || event.type === 'block-banner') {
                // For blocks, check if it's clinic-wide or specific to professional
                if (!event.resource.is_clinic_wide && event.resource.professional_id !== selectedProfessional) return false;
            }
        }

        return true;
    });

    // Check if a date is a weekend
    const isWeekend = (date: Date): boolean => {
        const day = date.getDay();
        return day === 0 || day === 6;
    };

    // Check if a date is a holiday
    const isHolidayDate = (date: Date): boolean => {
        return holidays.some(h => {
            const [year, month, day] = h.date.split('-').map(Number);
            const holidayDate = new Date(year, month - 1, day);
            return isSameDay(date, holidayDate);
        });
    };

    // Check if time is outside business hours
    const isOutsideBusinessHours = (date: Date): boolean => {
        const dayOfWeek = date.getDay();
        const hours = businessHours.find(bh => bh.day_of_week === dayOfWeek);
        if (!hours || !hours.is_active) return true;

        const timeStr = format(date, 'HH:mm');
        return !hours.time_ranges.some(range => timeStr >= range.start && timeStr <= range.end);
    };

    // Get holiday name for a date
    const getHolidayName = (date: Date): string | null => {
        const holiday = holidays.find(h => {
            const [year, month, day] = h.date.split('-').map(Number);
            const holidayDate = new Date(year, month - 1, day);
            return isSameDay(date, holidayDate);
        });
        return holiday?.description || null;
    };

    const openAppointmentModal = (slot: Date) => {
        setSelectedSlot(slot);
        setSelectedEvent(undefined);
        setIsModalOpen(true);
    };



    const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
        const slot = slotInfo.start;
        const warnings: string[] = [];

        const dayName = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][slot.getDay()];

        if (isWeekend(slot)) {
            warnings.push(`Este agendamento será em um ${dayName}.`);
        }

        const holidayName = getHolidayName(slot);
        if (holidayName) {
            warnings.push(`Este dia é um feriado: ${holidayName}.`);
        }

        if (!isWeekend(slot) && view !== Views.MONTH && isOutsideBusinessHours(slot)) {
            warnings.push('Este horário está fora do horário de funcionamento da clínica.');
        }

        if (warnings.length > 0) {
            setWarningModal({
                isOpen: true,
                message: warnings.join(' ') + ' Deseja continuar com o agendamento?',
                pendingSlot: slot,
            });
        } else {
            openAppointmentModal(slot);
        }
    };

    const handleSelectEvent = (event: any) => {
        if (event.type === 'holiday') return;
        if (event.type === 'block' || event.type === 'block-banner') {
            // Open block modal in edit mode
            setSelectedBlock(event.resource);
            setIsBlockModalOpen(true);
            return;
        }
        setSelectedEvent(event);
        setSelectedSlot(undefined);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        fetchAppointments();
    };

    const handleWarningConfirm = () => {
        const slot = warningModal.pendingSlot;
        setWarningModal({ isOpen: false, message: '' });
        if (slot) openAppointmentModal(slot);
    };

    const handleWarningCancel = () => {
        setWarningModal({ isOpen: false, message: '' });
    };

    // State for Mobile Sidebar
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Effect to handle mobile view default
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setView(Views.DAY);
            }
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Navigate functions
    const navigatePrev = () => {
        const newDate = new Date(date);
        if (view === Views.MONTH) newDate.setMonth(date.getMonth() - 1);
        else if (view === Views.WEEK) newDate.setDate(date.getDate() - 7);
        else newDate.setDate(date.getDate() - 1);
        setDate(newDate);
    };

    const navigateNext = () => {
        const newDate = new Date(date);
        if (view === Views.MONTH) newDate.setMonth(date.getMonth() + 1);
        else if (view === Views.WEEK) newDate.setDate(date.getDate() + 7);
        else newDate.setDate(date.getDate() + 1);
        setDate(newDate);
    };

    const viewLabels: Record<string, string> = {
        [Views.MONTH]: 'Mês',
        [Views.WEEK]: 'Semana',
        [Views.DAY]: 'Dia',
        [Views.AGENDA]: 'Agenda',
    };

    // Day styling: weekends get a light blue/gray tint
    const dayPropGetter = useCallback((date: Date) => {
        const day = date.getDay();
        const isSat = day === 6;
        const isSun = day === 0;
        const isHol = isHolidayDate(date);

        if (isHol) {
            return {
                style: {
                    backgroundColor: '#fef3c7', // amber-100
                },
                className: 'rbc-day-holiday',
            };
        }
        if (isSat || isSun) {
            return {
                style: {
                    backgroundColor: '#f0f4ff', // light blue-gray
                },
                className: 'rbc-day-weekend',
            };
        }
        return {};
    }, [holidays]);

    // Slot styling for week/day views
    const slotPropGetter = useCallback((date: Date) => {
        const day = date.getDay();
        if (day === 0 || day === 6) {
            return {
                style: { backgroundColor: '#f0f4ff' },
            };
        }
        return {};
    }, []);

    // Custom header with Tailwind classes (fixing lint)
    const CustomDayHeader = useCallback(({ date: headerDate, label }: { date: Date; label: string }) => (
        <div className="rbc-day-header-custom flex items-center justify-center gap-2 w-full px-1 py-0.5">
            <span className="capitalize text-sm font-medium text-gray-700">{label}</span>
            <button
                title="Novo agendamento"
                onClick={(e) => {
                    e.stopPropagation();
                    const slot = new Date(headerDate);
                    slot.setHours(9, 0, 0, 0); // default to 09:00
                    openAppointmentModal(slot);
                }}
                className="hover:text-blue-600 text-gray-400 transition-colors flex items-center justify-center p-0 bg-transparent border-0 cursor-pointer leading-none"
            >
                <span className="material-symbols-outlined !text-xl">add_circle</span>
            </button>
        </div>
    ), []);

    return (
        <div className="flex h-screen bg-white overflow-hidden relative">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                w-64 bg-white border-r border-gray-200 flex flex-col h-full
                fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
                lg:relative lg:translate-x-0 lg:w-60
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex items-center justify-between p-3 border-b border-gray-100 lg:hidden">
                    <h3 className="font-bold text-gray-800">Menu da Agenda</h3>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    {/* Create Button */}
                    <button
                        onClick={() => {
                            setSelectedEvent(undefined);
                            setSelectedSlot(new Date());
                            setIsModalOpen(true);
                            setIsSidebarOpen(false);
                        }}
                        className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-all text-sm font-medium text-gray-700 hover:bg-gray-50 w-full justify-center"
                    >
                        <span className="material-symbols-outlined text-xl">add</span>
                        Criar
                    </button>

                    {/* Schedule Block Button */}
                    <button
                        onClick={() => { setIsBlockModalOpen(true); setIsSidebarOpen(false); }}
                        className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-all text-sm font-medium text-gray-700 hover:bg-gray-50 w-full justify-center"
                    >
                        <span className="material-symbols-outlined text-xl">block</span>
                        Bloqueio
                    </button>

                    {/* Report Button */}
                    <button
                        onClick={() => { setIsReportOpen(true); setIsSidebarOpen(false); }}
                        className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-all text-sm font-medium text-gray-700 hover:bg-gray-50 w-full justify-center"
                    >
                        <span className="material-symbols-outlined text-xl">bar_chart</span>
                        Relatório
                    </button>

                    <button
                        onClick={() => { setIsExtractOpen(true); setIsSidebarOpen(false); }}
                        className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-all text-sm font-medium text-gray-700 hover:bg-gray-50 w-full justify-center"
                    >
                        <span className="material-symbols-outlined text-xl">receipt_long</span>
                        Extrato
                    </button>

                    {/* Mini Calendar */}
                    <div className="mb-4">
                        <MiniCalendar
                            currentDate={date}
                            onDateSelect={(newDate) => {
                                setDate(newDate);
                                // If already in Agenda view, the CustomAgenda component will handle scrolling via useEffect
                                if (view !== Views.AGENDA && view !== Views.DAY) {
                                    setView(Views.DAY);
                                }
                                if (window.innerWidth < 1024) setIsSidebarOpen(false);
                            }}
                        />
                    </div>

                    {/* Filters */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
                            <button
                                onClick={() => {
                                    setSelectedStatus('Todos');
                                    setSelectedProfessional('all');
                                }}
                                className="text-xs text-purple-600 hover:underline"
                            >
                                Limpar
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                                <select
                                    title="Filtrar por Status"
                                    aria-label="Filtrar por Status"
                                    className="w-full text-xs border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                >
                                    <option>Todos</option>
                                    <option>Agendado</option>
                                    <option>Realizado</option>
                                    <option>Cancelado</option>
                                    <option value="confirmed">Confirmado</option>
                                    <option value="no_show">Não compareceu</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Profissional</label>
                                <select
                                    title="Filtrar por Profissional"
                                    aria-label="Filtrar por Profissional"
                                    className="w-full text-xs border-gray-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500"
                                    value={selectedProfessional}
                                    onChange={(e) => setSelectedProfessional(e.target.value)}
                                >
                                    <option value="all">Todos</option>
                                    {professionals.map(pro => (
                                        <option key={pro.id} value={pro.id}>{pro.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legend - Sticky Footer */}
                <div className="p-3 border-t border-gray-100 bg-white">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Legenda</p>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-blue-50 border border-blue-200" />
                            <span className="text-xs text-gray-500">Fim de semana</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300" />
                            <span className="text-xs text-gray-500">Feriado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-red-100 border-l-2 border-red-500" />
                            <span className="text-xs text-gray-500">Bloqueio</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-gray-50">
                {/* Custom Toolbar — responsive */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 md:px-6 py-3 bg-white border-b border-gray-200">
                    {/* Top Row on Mobile: Sidebar Toggle + Nav */}
                    <div className="flex items-center justify-between w-full md:w-auto gap-3">
                        {/* Mobile Sidebar Toggle */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full"
                        >
                            <span className="material-symbols-outlined">filter_list</span>
                        </button>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setDate(new Date())}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Hoje
                            </button>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={navigatePrev}
                                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                    title="Anterior"
                                >
                                    <span className="material-symbols-outlined text-xl">chevron_left</span>
                                </button>
                                <button
                                    onClick={navigateNext}
                                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                    title="Próximo"
                                >
                                    <span className="material-symbols-outlined text-xl">chevron_right</span>
                                </button>
                            </div>
                        </div>

                        {/* View Selector (Mobile - moved up) */}
                        <div className="flex md:hidden items-center gap-1 bg-gray-100 rounded-md p-1 ml-auto">
                            <button
                                onClick={() => setView(Views.DAY)}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${view === Views.DAY ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
                            >
                                Dia
                            </button>
                            <button
                                onClick={() => setView(Views.AGENDA)}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${view === Views.AGENDA ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
                            >
                                Lista
                            </button>
                        </div>
                    </div>

                    {/* Center: Current Date - Full width center on mobile */}
                    <div className="flex items-center justify-center gap-3 w-full md:w-auto">
                        <div className="text-sm font-medium text-gray-700 capitalize">
                            {format(date, view === Views.DAY ? 'EEE dd/MM' : (view === Views.MONTH ? 'MMMM yyyy' : 'dd MMMM yyyy'), { locale: ptBR })}
                        </div>

                        {view === Views.DAY && (
                            <button
                                title="Novo agendamento"
                                onClick={() => {
                                    const slot = new Date(date);
                                    const now = new Date();
                                    if (isSameDay(date, now)) {
                                        slot.setHours(now.getHours(), now.getMinutes(), 0, 0);
                                    } else {
                                        slot.setHours(9, 0, 0, 0);
                                    }
                                    openAppointmentModal(slot);
                                }}
                                className="text-gray-400 hover:text-primary transition-colors flex items-center"
                            >
                                <span className="material-symbols-outlined !text-xl">add_circle</span>
                            </button>
                        )}
                    </div>

                    {/* Right: View Selector (Desktop Only) */}
                    <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-md p-1">
                        {([Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA] as View[]).map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                {viewLabels[v]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Calendar — toolbar hidden to avoid duplication */}
                <div className={`flex-1 ${view === Views.AGENDA ? 'overflow-hidden' : 'p-4'}`}>
                    {/* Agenda View Integration */}
                    {view === Views.AGENDA ? (
                        <div className="h-full">
                            <CustomAgenda
                                events={allEvents}
                                date={date}
                                onNavigate={setDate}
                            />
                        </div>
                    ) : (
                        <Calendar
                            localizer={localizer}
                            events={allEvents}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: 'calc(100vh - 130px)' }}
                            view={view}
                            onView={setView}
                            date={date}
                            onNavigate={setDate}
                            culture="pt-BR"
                            messages={messages}
                            tooltipAccessor={() => null}
                            toolbar={false}
                            scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
                            longPressThreshold={0}
                            components={{
                                week: { header: CustomDayHeader },
                                day: { header: CustomDayHeader },
                                event: (props) => {
                                    if (props.event.type === 'holiday') {
                                        return (
                                            <div className="text-xs font-medium text-amber-800 bg-amber-100 px-1 py-0.5 rounded truncate">
                                                {props.event.title}
                                            </div>
                                        );
                                    }
                                    if (props.event.type === 'block' || props.event.type === 'block-banner') {
                                        return (
                                            <div className="text-xs font-medium text-red-900 px-1 py-0.5 rounded truncate flex items-center gap-1">
                                                <span className="material-symbols-outlined text-xs">block</span>
                                                {props.event.title}
                                            </div>
                                        );
                                    }
                                    return <AgendaEvent {...props} />;
                                },
                            }}
                            formats={{
                                timeGutterFormat: 'HH:mm',
                                dayFormat: (date, culture, localizer) =>
                                    localizer!.format(date, 'EEEE dd/MM', culture).replace('-feira', ''),
                                weekdayFormat: (date, culture, localizer) =>
                                    localizer!.format(date, 'EEE', culture),
                            }}
                            selectable
                            onSelectSlot={handleSelectSlot}
                            onSelectEvent={handleSelectEvent}
                            dayPropGetter={dayPropGetter}
                            slotPropGetter={slotPropGetter}
                            eventPropGetter={(event) => {
                                if (event.type === 'holiday') {
                                    return {
                                        style: {
                                            backgroundColor: '#fef3c7',
                                            border: '1px solid #f59e0b',
                                            color: '#92400e',
                                            padding: '2px 4px',
                                        },
                                    };
                                }
                                if (event.type === 'block-banner') {
                                    return {
                                        style: {
                                            backgroundColor: '#fecaca',
                                            border: '1px solid #f87171',
                                            color: '#7f1d1d',
                                            padding: '1px 4px',
                                            fontSize: '0.7rem',
                                            cursor: 'pointer',
                                        },
                                    };
                                }
                                if (event.type === 'block') {
                                    return {
                                        style: {
                                            backgroundColor: '#fee2e2',
                                            borderLeft: '4px solid #dc2626',
                                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(220,38,38,0.12) 4px, rgba(220,38,38,0.12) 8px)',
                                            color: '#7f1d1d',
                                            padding: '2px 4px',
                                            cursor: 'default',
                                        },
                                    };
                                }

                                const status = event.resource?.status || 'scheduled';
                                let bg, border, color;

                                switch (status) {
                                    case 'confirmed':
                                        bg = '#4ade80'; // green-400
                                        border = '#16a34a'; // green-600
                                        color = '#fff';
                                        break;
                                    case 'completed':
                                        bg = '#9ca3af'; // gray-400
                                        border = '#4b5563'; // gray-600
                                        color = '#fff';
                                        break;
                                    case 'cancelled':
                                        bg = '#f87171'; // red-400
                                        border = '#dc2626'; // red-600
                                        color = '#fff';
                                        break;
                                    case 'no_show':
                                        bg = '#374151'; // gray-700
                                        border = '#111827'; // gray-900
                                        color = '#fff';
                                        break;
                                    case 'scheduled':
                                    default:
                                        bg = '#60a5fa'; // blue-400
                                        border = '#2563eb'; // blue-600
                                        color = '#fff';
                                        break;
                                    case 'rescheduled':
                                        bg = '#e9d5ff'; // purple-200
                                        border = '#9333ea'; // purple-600
                                        color = '#6b21a8'; // purple-800
                                        break;
                                }

                                return {
                                    className: 'rbc-event-custom',
                                    style: {
                                        backgroundColor: bg,
                                        borderLeft: `4px solid ${border}`,
                                        color: color,
                                        padding: '0 4px',
                                        borderTop: 'none',
                                        borderRight: 'none',
                                        borderBottom: 'none',
                                        fontSize: '0.75rem',
                                        opacity: status === 'cancelled' ? 0.7 : 1,
                                    },
                                };
                            }}
                        />
                    )}
                </div>

                {/* FAB */}
                <button
                    className="fixed bottom-8 right-8 z-30 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
                    onClick={() => {
                        setSelectedSlot(new Date());
                        setSelectedEvent(undefined);
                        setIsModalOpen(true);
                    }}
                >
                    <span className="material-symbols-outlined text-3xl">add</span>
                </button>

                <AppointmentModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleModalSuccess}
                    patients={patients}
                    procedures={procedures}
                    professionals={professionals}
                    initialDate={selectedSlot}
                    initialEvent={selectedEvent}
                    clinicId={clinicId}
                />

                {clinicId && (
                    <ScheduleBlockModal
                        isOpen={isBlockModalOpen}
                        onClose={() => {
                            setIsBlockModalOpen(false);
                            setSelectedBlock(undefined);
                        }}
                        onSuccess={refetchBlocks}
                        clinicId={clinicId}
                        professionals={professionals.map(p => ({ id: p.id, name: p.full_name }))}
                        initialDate={date.toISOString().split('T')[0]}
                        editingBlock={selectedBlock}
                    />
                )}
            </main>

            {/* Warning Modal */}
            <WarningModal
                isOpen={warningModal.isOpen}
                message={warningModal.message}
                onConfirm={handleWarningConfirm}
                onCancel={handleWarningCancel}
            />

            {/* Report Modal */}
            <AgendaReport
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                professionals={professionals}
            />

            {/* Extract Modal */}
            <ProfessionalExtractModal
                isOpen={isExtractOpen}
                onClose={() => setIsExtractOpen(false)}
                professionals={professionals}
            />
        </div>
    );
};

export default Agenda;
