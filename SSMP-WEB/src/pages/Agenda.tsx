import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { AgendaService, Appointment } from '../services/AgendaService';
import { Patient, Procedure } from '../../types';
import AgendaEvent from '../../components/AgendaEvent';
import MiniCalendar from '../../components/MiniCalendar';
import AgendaReport from '../components/agenda/AgendaReport';
import UnifiedAgendaModal from '../../components/agenda/UnifiedAgendaModal';
import CustomAgenda from '../components/agenda/CustomAgenda';
import ProfessionalExtractModal from '../components/agenda/ProfessionalExtractModal';
import { supabase } from '../lib/supabase';
import { useHolidays } from '../hooks/useHolidays';
import { useBusinessHours } from '../hooks/useBusinessHours';
import { useScheduleBlocks } from '../hooks/useScheduleBlocks';
import AppointmentModal from '../../components/AppointmentModal';

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
    const [view, setView] = useState<View>('work_week' as any);
    const [date, setDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [professionals, setProfessionals] = useState<any[]>([]);
    const [selectedProfessional, setSelectedProfessional] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
    const [clinicId, setClinicId] = useState<string | null>(null);

    const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);
    const [modalDefaultTab, setModalDefaultTab] = useState<'appointment' | 'block'>('appointment');
    const [selectedSlot, setSelectedSlot] = useState<Date | undefined>(undefined);
    const [selectedEvent, setSelectedEvent] = useState<any | undefined>(undefined);
    const [selectedBlock, setSelectedBlock] = useState<any | undefined>(undefined);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isExtractOpen, setIsExtractOpen] = useState(false);
    const [isModalReadOnly, setIsModalReadOnly] = useState(false);
    const [conflictDetailAppt, setConflictDetailAppt] = useState<any>(null);
    const [isConflictDetailReadOnly, setIsConflictDetailReadOnly] = useState(false);

    // Popover state for Month View Summary
    const [monthPopover, setMonthPopover] = useState<{
        date: Date;
        title: string;
        events: any[];
        type: 'scheduled' | 'confirmed' | 'blocks' | 'holidays';
        anchorRect: { top: number; left: number } | null;
    } | null>(null);

    // Warning Modal State
    const [warningModal, setWarningModal] = useState<{
        isOpen: boolean;
        message: string;
        pendingSlot?: Date;
    }>({ isOpen: false, message: '' });

    // Interstitial Modal for Block Conflicts
    const [interstitialModal, setInterstitialModal] = useState<{
        isOpen: boolean;
        block?: any;
        slot?: Date;
    }>({ isOpen: false });

    // Hooks
    const { holidays } = useHolidays(clinicId || undefined);
    const { businessHours, getBusinessHoursForDate } = useBusinessHours(clinicId || undefined);
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
            // Expand range to sub/add 1 month to catch boundary events in week/month views
            const start = startOfMonth(subMonths(date, 1));
            const end = endOfMonth(addMonths(date, 1));
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

        // Determine effective times
        const startTimeStr = block.is_full_day ? '00:00:00' : (block.start_time || '00:00:00');
        const endTimeStr = block.is_full_day ? '23:59:59' : (block.end_time || '23:59:59');

        const [sh, sm] = startTimeStr.split(':').map(Number);
        const [eh, em] = endTimeStr.split(':').map(Number);
        const start = new Date(year, month - 1, day, sh, sm);
        const end = new Date(year, month - 1, day, eh, em);

        // Banner title (different if partial)
        const bannerTitle = block.is_full_day 
            ? label 
            : `🚫 ${block.start_time?.slice(0, 5)}–${block.end_time?.slice(0, 5)} ${block.reason || 'Bloqueio'}`;

        return [
            // 1. All-day banner at the top
            {
                id: `block-banner-${block.id}`,
                title: bannerTitle,
                start: baseDate,
                end: new Date(year, month - 1, day + 1),
                allDay: true,
                resource: block,
                type: 'block-banner',
            },
            // 2. Timed event spanning the blocked hours (fills the grid)
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

    const regularEvents = allEvents.filter(e => e.type !== 'block' && e.type !== 'holiday' && e.type !== 'block-banner');
    const backgroundEvents = allEvents.filter(e => e.type === 'block');

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

    const openAppointmentModal = (slot?: Date, event?: any, readOnly = false) => {
        const targetSlot = slot || new Date();
        setSelectedSlot(targetSlot);
        setSelectedEvent(event);
        setModalDefaultTab('appointment');
        setSelectedBlock(undefined);

        setIsModalReadOnly(readOnly);
        setIsUnifiedModalOpen(true);
    };

    const openBlockModal = (block?: any) => {
        if (block?.date && block?.start_time) {
            try {
                const [year, month, day] = block.date.split('-').map(Number);
                const [hour, minute] = block.start_time.split(':').map(Number);
                const blockDate = new Date(year, month - 1, day, hour, minute);
                setSelectedSlot(blockDate);
            } catch (e) {
                console.error("Error parsing block date/time", e);
                setSelectedSlot(new Date());
            }
        } else {
            setSelectedSlot(new Date());
        }
        
        setSelectedBlock(block);
        setModalDefaultTab('block');
        setSelectedEvent(undefined);
        setIsModalReadOnly(false);
        setIsUnifiedModalOpen(true);
    };

    const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
        const slot = slotInfo.start;
        
        // 1. Detect if slot is blocked
        const overlappingBlock = scheduleBlocks.find(block => {
            if (selectedProfessional !== 'all' && block.professional_id !== selectedProfessional) {
                return false;
            }
            const [by, bm, bd] = block.date.split('-').map(Number);
            const blockDate = new Date(by, bm - 1, bd);
            if (!isSameDay(slot, blockDate)) return false;
            if (block.is_full_day) return true;

            const [sh, sm] = (block.start_time || '00:00').split(':').map(Number);
            const [eh, em] = (block.end_time || '23:59').split(':').map(Number);
            const bStart = new Date(by, bm - 1, bd, sh, sm);
            const bEnd = new Date(by, bm - 1, bd, eh, em);
            return slot >= bStart && slot < bEnd;
        });

        if (overlappingBlock) {
            setInterstitialModal({
                isOpen: true,
                block: overlappingBlock,
                slot: slot
            });
            return;
        }

        // 2. Normal flow for warnings
        proceedWithSlotSelection(slot);
    };

    const proceedWithSlotSelection = (slot: Date) => {
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
            openBlockModal(event.resource);
            return;
        }
        openAppointmentModal(undefined, event);
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

    // Visualization Options
    const [hideWeekends, setHideWeekends] = useState(true);
    const [hideOffHours, setHideOffHours] = useState(true);

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
        if (view === Views.MONTH) {
            newDate.setMonth(date.getMonth() - 1);
        } else {
            newDate.setDate(date.getDate() - 1);
            // Pular finais de semana se estiverem ocultos
            if (hideWeekends) {
                while (newDate.getDay() === 0 || newDate.getDay() === 6) {
                    newDate.setDate(newDate.getDate() - 1);
                }
            }
        }
        setDate(newDate);
    };

    const navigateNext = () => {
        const newDate = new Date(date);
        if (view === Views.MONTH) {
            newDate.setMonth(date.getMonth() + 1);
        } else {
            newDate.setDate(date.getDate() + 1);
            // Pular finais de semana se estiverem ocultos
            if (hideWeekends) {
                while (newDate.getDay() === 0 || newDate.getDay() === 6) {
                    newDate.setDate(newDate.getDate() + 1);
                }
            }
        }
        setDate(newDate);
    };

    const viewLabels: Record<string, string> = {
        [Views.MONTH]: 'Mês',
        [Views.WEEK]: 'Semana',
        'work_week': 'Semana',
        [Views.DAY]: 'Dia',
        [Views.AGENDA]: 'Agenda',
    };

    const dayPropGetter = useCallback((cellDate: Date) => {
        const isToday = isSameDay(cellDate, new Date());
        const isHol = isHolidayDate(cellDate);
        const day = cellDate.getDay();
        const isWeekend = day === 0 || day === 6;
        
        // Detectar se o dia possui bloqueios (para visualização mensal)
        const hasBlocks = allEvents.some(e => 
            isSameDay(e.start, cellDate) && (e.type === 'block' || e.type === 'block-banner')
        );

        const classes = [];
        if (isHol) classes.push('rbc-day-holiday');
        if (isWeekend) classes.push('rbc-day-weekend');
        if (isToday) classes.push('rbc-today');
        if (hasBlocks) classes.push('rbc-day-has-blocks');

        return {
            className: classes.join(' '),
            ...(isToday ? { style: { backgroundColor: '#fff1f2' } } : {})
        };
    }, [holidays, allEvents]);

    // Slot styling for week/day views
    const slotPropGetter = useCallback((slotDate: Date) => {
        const timeStr = format(slotDate, 'HH:mm');
        const ranges = getBusinessHoursForDate(slotDate);
        const isToday = isSameDay(slotDate, new Date());

        // Check if within any active range
        const isWithinBusinessHours = ranges.some(range => {
            return timeStr >= range.start && timeStr < range.end;
        });

        const isHol = isHolidayDate(slotDate);
        const isSatSun = slotDate.getDay() === 0 || slotDate.getDay() === 6;

        // Se estiver no horário comercial E NÃO for feriado/fim de semana, fica branco (ou azul claro se for hoje)
        if (isWithinBusinessHours && !isHol && !isSatSun) {
            return {
                style: {
                    backgroundColor: isToday ? '#fff1f2' : 'white',
                    pointerEvents: 'auto',
                },
            };
        }

        // Caso contrário (fora de hora, feriado ou fim de semana), fica transparente para mostrar o padrão do fundo
        return {
            style: {
                backgroundColor: 'transparent',
                pointerEvents: 'auto',
            },
            className: `rbc-off-hours-slot ${isToday ? 'is-today' : ''}`,
        };
    }, [getBusinessHoursForDate]);

    // Custom header with Tailwind classes (fixing lint)
    const CustomDayHeader = useCallback(({ date: headerDate, label }: { date: Date; label: string }) => {
        const isSelected = isSameDay(headerDate, date);
        
        // Buscar feriados para este dia
        const dayHolidays = holidays.filter(h => {
            const [y, m, d] = h.date.split('-').map(Number);
            return isSameDay(headerDate, new Date(y, m - 1, d));
        });

        // Buscar bloqueios para este dia (banners)
        const dayBlocks = scheduleBlocks.filter(block => {
            if (selectedProfessional !== 'all' && !block.is_clinic_wide && block.professional_id !== selectedProfessional) return false;
            const [y, m, d] = block.date.split('-').map(Number);
            return isSameDay(headerDate, new Date(y, m - 1, d));
        });
        
        return (
            <div className="flex flex-col items-center justify-center h-full w-full py-1.5">
                {/* Linha da Data - Elegante e Destaque */}
                <div className={`
                    text-[11px] font-bold flex items-center justify-center rounded-md transition-all duration-200 px-3.5
                    ${isSelected ? 'bg-red-600 text-white h-7 shadow-sm' : 'text-slate-600 h-7'}
                `}>
                    {label}
                </div>

                {/* Linha dos Indicadores - Design Premium (Aumentado em 30%) */}
                {(dayHolidays.length > 0 || dayBlocks.length > 0) && (
                    <div className="flex flex-wrap justify-center gap-2 mt-1 leading-none px-1">
                        {dayHolidays.map((h, i) => (
                            <div key={`hol-${i}`} className="bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                                <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
                                <span className="tracking-tight">{h.title || 'Feriado'}</span>
                            </div>
                        ))}
                        {dayBlocks.map((b, i) => (
                            <div key={`blk-${i}`} className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                                <div className="w-2 h-2 rounded-full bg-red-600" />
                                <span className="tracking-tight">{b.title || 'Bloqueio'}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }, [date, holidays, scheduleBlocks, selectedProfessional]);

    // Custom Month Date Header to show summary badges
    const CustomMonthDateHeader = useCallback(({ date: cellDate, label, onDrillDown }: any) => {
        // Filtrar eventos do dia, evitando duplicatas de blocos (usando apenas o tipo 'block')
        const dayEvents = allEvents.filter(e => isSameDay(e.start, cellDate));
        const dayAppointments = dayEvents.filter(e => e.type === 'appointment');
        const dayBlocks = dayEvents.filter(e => e.type === 'block'); // Removemos 'block-banner' para evitar duplicidade na lista
        const dayHolidays = allEvents.filter(e => isSameDay(e.start, cellDate) && e.type === 'holiday');

        // Purple Clock: scheduled, rescheduled, no_show
        const scheduledCount = dayAppointments.filter(e => ['scheduled', 'rescheduled', 'no_show'].includes(e.resource.status)).length;
        // Blue Bell: confirmed, completed
        const confirmedCount = dayAppointments.filter(e => ['confirmed', 'completed'].includes(e.resource.status)).length;
        // Gray Lock: blocks
        const blocksCount = dayBlocks.length;

        // Birthdays check - Safe comparison for YYYY-MM-DD
        const birthdaysCount = patients.filter(p => {
            if (!p.dob) return false;
            try {
                const [y, m, d] = p.dob.split('-').map(Number);
                return d === cellDate.getDate() && (m - 1) === cellDate.getMonth();
            } catch (e) {
                return false;
            }
        }).length;

        const isToday = isSameDay(cellDate, new Date());

        return (
            <div className="flex flex-col items-center w-full min-h-[70px] py-1 relative">
                {/* Date and Birthday Icon */}
                <div className="flex justify-between items-start w-full px-2 mb-2">
                    <div 
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDrillDown();
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`text-base font-bold px-2 py-0.5 rounded-full transition-all mx-auto cursor-pointer ${isToday ? 'bg-primary text-white shadow-md ring-2 ring-primary/20 scale-110' : 'text-gray-800 hover:text-primary hover:bg-primary/5'}`}
                        title="Ver visualização do dia"
                    >
                        {label}
                    </div>
                    {birthdaysCount > 0 && (
                        <div className="absolute top-1 right-1 pointer-events-none">
                            <span className="material-symbols-outlined text-pink-400 text-sm animate-pulse" title={`${birthdaysCount} aniversariante(s)`}>
                                featured_seasonal_and_gifts
                            </span>
                        </div>
                    )}
                </div>

                {/* Summary Badges */}
                <div className="flex flex-wrap justify-center gap-2 px-1 pb-1">
                    {scheduledCount > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMonthPopover({
                                    date: cellDate,
                                    title: 'Agendamentos Previstos',
                                    type: 'scheduled',
                                    events: dayAppointments.filter(ev => ['scheduled', 'rescheduled', 'no_show'].includes(ev.resource.status)),
                                    anchorRect: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX }
                                });
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full border border-purple-200 shadow-sm transition-all hover:scale-110 hover:bg-purple-200" 
                            title="Clique para ver lista"
                        >
                            <span className="material-symbols-outlined text-[22px]">schedule</span>
                            <span className="text-[17px] font-bold">{scheduledCount}</span>
                        </button>
                    )}
                    {confirmedCount > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMonthPopover({
                                    date: cellDate,
                                    title: 'Confirmados / Realizados',
                                    type: 'confirmed',
                                    events: dayAppointments.filter(ev => ['confirmed', 'completed'].includes(ev.resource.status)),
                                    anchorRect: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX }
                                });
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 shadow-sm transition-all hover:scale-110 hover:bg-emerald-200" 
                            title="Clique para ver lista"
                        >
                            <span className="material-symbols-outlined text-[22px]">notifications</span>
                            <span className="text-[17px] font-bold">{confirmedCount}</span>
                        </button>
                    )}
                    {blocksCount > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMonthPopover({
                                    date: cellDate,
                                    title: 'Bloqueios de Horário',
                                    type: 'blocks',
                                    events: dayBlocks,
                                    anchorRect: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX }
                                });
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-700 rounded-full border border-rose-200 shadow-sm transition-all hover:scale-110 hover:bg-rose-200" 
                            title="Clique para ver lista"
                        >
                            <span className="material-symbols-outlined text-[22px] font-bold">lock</span>
                            <span className="text-[17px] font-bold">{blocksCount}</span>
                        </button>
                    )}
                    {dayHolidays.length > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full border border-amber-200 shadow-sm" title={dayHolidays[0].title}>
                            <span className="material-symbols-outlined text-[22px]">event_note</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }, [allEvents, patients, setMonthPopover]);

    return (
        <div className="flex h-screen bg-white overflow-hidden relative">
            <style>{`
                /* Estilos para a Visualização Mensal */
                .rbc-month-view .rbc-month-row {
                    min-height: 100px;
                }
                .rbc-month-view .rbc-day-bg {
                    border-right: 1px solid #f1f5f9;
                }
                .rbc-month-view .rbc-header {
                    padding: 12px 0;
                    background: #f8fafc;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                }
                .rbc-month-view .rbc-date-cell {
                    padding: 0;
                    text-align: center;
                }
                .rbc-month-view .rbc-button-link {
                    width: 100%;
                }
                .rbc-month-view .rbc-off-range-bg {
                    background-color: #f8fafc !important;
                    background-image: repeating-linear-gradient(45deg, transparent, transparent 12px, #f1f5f9 12px, #f1f5f9 24px) !important;
                    opacity: 0.5;
                }

                /* Destaque para dias com bloqueio na visualização mensal */
                .rbc-month-view .rbc-day-bg.rbc-day-has-blocks {
                    background-image: repeating-linear-gradient(45deg, #ffffff, #ffffff 10px, #f1f5f9 10px, #f1f5f9 20px) !important;
                }
                
                .rbc-month-view .rbc-day-bg.rbc-day-holiday {
                    background-image: repeating-linear-gradient(45deg, #fffbeb, #fffbeb 10px, #fef3c7 10px, #fef3c7 20px) !important;
                }
                
                .rbc-month-view .rbc-day-bg.rbc-day-has-blocks.rbc-today {
                    background-image: repeating-linear-gradient(45deg, #fff1f2, #fff1f2 10px, #fce7f3 10px, #fce7f3 20px) !important;
                }

                /* Estilos para slots bloqueados e fora de hora (Week/Day View) */
                /* Listras Contínuas aplicadas na coluna para evitar quebras nos slots */
                .rbc-day-slot {
                    background-image: repeating-linear-gradient(45deg, #ffffff, #ffffff 10px, #f1f5f9 10px, #f1f5f9 20px) !important;
                }

                .rbc-day-slot.rbc-day-holiday {
                    background-image: repeating-linear-gradient(45deg, #fffbeb, #fffbeb 10px, #fef3c7 10px, #fef3c7 20px) !important;
                }

                .rbc-day-slot.rbc-today {
                    background-image: repeating-linear-gradient(45deg, #fff1f2, #fff1f2 10px, #fce7f3 10px, #fce7f3 20px) !important;
                }

                .rbc-day-slot.rbc-today.rbc-day-holiday {
                    background-image: repeating-linear-gradient(45deg, #fff1f2, #fff1f2 10px, #fef3c7 10px, #fef3c7 20px) !important;
                }

                /* Slots normais cobrem as listras com cor sólida */
                .rbc-time-slot {
                    background-color: white !important;
                }

                /* Slots de hoje cobrem as listras com rosa claro sólido */
                .rbc-day-slot.rbc-today .rbc-time-slot {
                    background-color: #fff1f2 !important;
                }

                /* Slots bloqueados ficam transparentes para revelar as listras contínuas do fundo */
                .rbc-time-slot.rbc-off-hours-slot {
                    background-color: transparent !important;
                    background-image: none !important;
                }

                /* Destaque para o dia atual no cabeçalho */
                .rbc-month-view .rbc-today,
                .rbc-month-view .rbc-day-bg.rbc-today {
                    background-color: #fff1f2 !important;
                }

                /* Ajuste para o popover flutuante */
                .month-summary-popover {
                    animation: popover-fade-in 0.2s ease-out;
                    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
                }
                @keyframes popover-fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }

                /* RESET E ALINHAMENTO TOTAL DA GRADE */
                .rbc-time-view, .rbc-time-view * {
                    box-sizing: border-box !important;
                }

                .rbc-timeslot-group {
                    border-bottom: 1px solid #f1f5f9 !important;
                    min-height: 48px !important;
                    height: 48px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    padding: 0 !important;
                }

                .rbc-time-slot {
                    flex: 1 !important;
                    border-top: none !important;
                    height: 100% !important;
                    display: flex !important;
                    align-items: center;
                    justify-content: center;
                }

                /* Linha de divisão de 30min (suave) */
                .rbc-timeslot-group .rbc-time-slot + .rbc-time-slot {
                    border-top: 1px dashed #f8fafc !important;
                }

                /* Coluna de Horas (Gutter) */
                .rbc-time-view .rbc-time-gutter {
                    background-color: white !important;
                    border-right: 1px solid #f1f5f9 !important;
                }
                
                .rbc-time-view .rbc-time-gutter .rbc-time-slot {
                    background-color: white !important;
                    background-image: none !important;
                }

                .rbc-day-slot {
                    background-color: white;
                    border-left: 1px solid #f1f5f9 !important;
                }
                /* Header adjustments */
                .rbc-time-header .rbc-header {
                    border-bottom: 1px solid #f1f5f9 !important;
                    background: #ffffff !important;
                    padding: 0 !important;
                    min-height: 60px !important;
                    height: 60px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                
                /* Remover a faixa cinza/branca de eventos de dia inteiro (All-day row) */
                .rbc-time-view .rbc-allday-cell,
                .rbc-time-view .rbc-time-header-row {
                    display: none !important;
                }

                .rbc-time-header-content {
                    border-left: none !important;
                }
            `}</style>
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

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {/* Action Menu */}
                    <div className="mb-8">
                        <h3 className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Ações da Agenda</h3>
                        <div className="space-y-1">
                            <button
                                onClick={() => openAppointmentModal(new Date())}
                                className="group flex items-center gap-3 w-full px-3 py-2 rounded-xl text-gray-600 hover:bg-purple-50 hover:text-purple-700 transition-all duration-200"
                            >
                                <span className="material-symbols-outlined text-[20px] text-purple-500 group-hover:text-purple-600 transition-colors">add_box</span>
                                <span className="text-sm font-semibold tracking-tight">Criar Agendamento</span>
                            </button>

                            <button
                                onClick={() => openBlockModal()}
                                className="group flex items-center gap-3 w-full px-3 py-2 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                            >
                                <span className="material-symbols-outlined text-[20px] text-red-500 group-hover:text-red-600 transition-colors">block</span>
                                <span className="text-sm font-semibold tracking-tight">Bloquear Horário</span>
                            </button>

                            <button
                                onClick={() => { setIsReportOpen(true); setIsSidebarOpen(false); }}
                                className="group flex items-center gap-3 w-full px-3 py-2 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
                            >
                                <span className="material-symbols-outlined text-[20px] text-blue-500 group-hover:text-blue-600 transition-colors">analytics</span>
                                <span className="text-sm font-semibold tracking-tight">Relatório Geral</span>
                            </button>

                            <button
                                onClick={() => { setIsExtractOpen(true); setIsSidebarOpen(false); }}
                                className="group flex items-center gap-3 w-full px-3 py-2 rounded-xl text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200"
                            >
                                <span className="material-symbols-outlined text-[20px] text-emerald-500 group-hover:text-emerald-600 transition-colors">account_balance_wallet</span>
                                <span className="text-sm font-semibold tracking-tight">Extrato Profissional</span>
                            </button>
                        </div>
                    </div>

                    {/* Mini Calendar */}
                    <div className="mb-8">
                        <h3 className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Calendário</h3>
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
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-3 px-3">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filtros</h3>
                            <button
                                onClick={() => {
                                    setSelectedStatus('Todos');
                                    setSelectedProfessional('all');
                                }}
                                className="text-[10px] font-bold text-purple-600 hover:text-purple-700 uppercase tracking-wider"
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

                    {/* Visualization Options */}
                    <div className="mb-8 pt-4 border-t border-gray-100">
                        <h3 className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Visualização</h3>
                        <div className="space-y-2.5">
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 transition-colors"
                                        checked={hideWeekends}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setHideWeekends(checked);
                                            if (checked && view === Views.WEEK) {
                                                setView(Views.WORK_WEEK);
                                            } else if (!checked && view === Views.WORK_WEEK) {
                                                setView(Views.WEEK);
                                            }
                                        }}
                                    />
                                </div>
                                <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">Ocultar Finais de Semana</span>
                            </label>

                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 transition-colors"
                                        checked={hideOffHours}
                                        onChange={(e) => setHideOffHours(e.target.checked)}
                                    />
                                </div>
                                <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">Horário Comercial</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Legend - Sticky Footer */}
                <div className="p-4 border-t border-gray-100 bg-white">
                    <h3 className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Legenda</h3>
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
                                <span className="material-symbols-outlined !text-xl">add_box</span>
                            </button>
                        )}
                    </div>

                    {/* Right: View Selector (Desktop Only) */}
                    <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-md p-1">
                        {([Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA] as View[]).map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                                    (view === v || (v === Views.WEEK && view === 'work_week')) 
                                        ? 'bg-white text-gray-900 shadow-sm' 
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {viewLabels[v]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Calendar — toolbar hidden to avoid duplication */}
                <div className={`flex-1 ${view === Views.AGENDA ? 'overflow-hidden' : 'p-4'} ${hideWeekends ? 'hide-weekends' : ''}`}>
                    {/* Agenda View Integration */}
                    {view === Views.AGENDA ? (
                        <div className="h-full">
                            <CustomAgenda
                                events={allEvents}
                                date={date}
                                onNavigate={setDate}
                                onSelectEvent={handleSelectEvent}
                            />
                        </div>
                    ) : (
                        <Calendar
                            localizer={localizer}
                            events={view === Views.MONTH ? [] : regularEvents}
                            backgroundEvents={view === Views.MONTH ? [] : backgroundEvents}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: 'calc(100vh - 130px)' }}
                            view={view === Views.WEEK && hideWeekends ? Views.WORK_WEEK : view}
                            onView={(v) => setView(v as View)}
                            date={date}
                            onNavigate={setDate}
                            culture="pt-BR"
                            messages={messages}
                            views={{
                                month: true,
                                week: true,
                                work_week: true,
                                day: true,
                                agenda: true
                            }}
                            tooltipAccessor={() => null}
                            toolbar={false}
                            min={hideOffHours ? new Date(0, 0, 0, 8, 0, 0) : undefined}
                            max={hideOffHours ? new Date(0, 0, 0, 21, 0, 0) : undefined}
                            scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
                            longPressThreshold={0}
                            components={{
                                week: { header: CustomDayHeader },
                                work_week: { header: CustomDayHeader },
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
                                month: {
                                    dateHeader: CustomMonthDateHeader,
                                    event: () => null // Hide individual events in month view to show summary only
                                }
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
                                            backgroundColor: '#fffbeb',
                                            borderLeft: '4px solid #f59e0b',
                                            borderTop: '1px solid white',
                                            borderRight: '1px solid white',
                                            borderBottom: '1px solid white',
                                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,158,11,0.12) 4px, rgba(245,158,11,0.12) 8px)',
                                            color: '#92400e',
                                            padding: '2px 4px',
                                            pointerEvents: 'none',
                                            zIndex: 1
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
                                            borderTop: '1px solid white',
                                            borderRight: '1px solid white',
                                            borderBottom: '1px solid white',
                                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(220,38,38,0.12) 4px, rgba(220,38,38,0.12) 8px)',
                                            color: '#7f1d1d',
                                            padding: '2px 4px',
                                            pointerEvents: 'none',
                                        },
                                    };
                                }

                                const status = event.resource?.status || 'scheduled';
                                let bg, border, color;

                                // Base style for appointments to ensure they are on top of blocks
                                const baseStyle: React.CSSProperties = {
                                    zIndex: 10,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                };

                                switch (status) {
                                    case 'confirmed':
                                        bg = '#f0fdf4'; // green-50
                                        border = '#22c55e'; // green-500
                                        color = '#111827';
                                        break;
                                    case 'completed':
                                        bg = '#f9fafb'; // gray-50
                                        border = '#6b7280'; // gray-500
                                        color = '#111827';
                                        break;
                                    case 'cancelled':
                                        bg = '#fef2f2'; // red-50
                                        border = '#ef4444'; // red-500
                                        color = '#111827';
                                        break;
                                    case 'no_show':
                                        bg = '#f8fafc'; // slate-50
                                        border = '#1e293b'; // slate-800
                                        color = '#111827';
                                        break;
                                    case 'scheduled':
                                    default:
                                        bg = '#eff6ff'; // blue-50
                                        border = '#3b82f6'; // blue-500
                                        color = '#111827';
                                        break;
                                    case 'rescheduled':
                                        bg = '#faf5ff'; // purple-50
                                        border = '#a855f7'; // purple-500
                                        color = '#111827';
                                        break;
                                }

                                return {
                                    className: 'rbc-event-custom',
                                    style: {
                                        ...baseStyle,
                                        backgroundColor: bg,
                                        borderLeft: `4px solid ${border}`,
                                        borderTop: '1px solid white',
                                        borderRight: '1px solid white',
                                        borderBottom: '1px solid white',
                                        color: color,
                                        padding: '0 4px',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                        opacity: status === 'cancelled' ? 0.75 : 1,
                                    },
                                };
                            }}
                        />
                    )}
                </div>

                {/* FAB */}
                <button
                    className="fixed bottom-8 right-8 z-30 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
                    onClick={() => openAppointmentModal(new Date())}
                >
                    <span className="material-symbols-outlined text-3xl">add</span>
                </button>

                <UnifiedAgendaModal
                    isOpen={isUnifiedModalOpen}
                    onClose={() => setIsUnifiedModalOpen(false)}
                    onSuccess={() => {
                        handleModalSuccess();
                        refetchBlocks();
                    }}
                    patients={patients}
                    procedures={procedures}
                    professionals={professionals}
                    initialDate={selectedSlot}
                    initialEvent={selectedEvent}
                    clinicId={clinicId}
                    defaultTab={modalDefaultTab}
                    editingBlock={selectedBlock}
                    isReadOnly={isModalReadOnly}
                    onEditAppointment={(appt) => {
                        setConflictDetailAppt(appt);
                        setIsConflictDetailReadOnly(false);
                    }}
                    onViewAppointment={(appt) => {
                        setConflictDetailAppt(appt);
                        setIsConflictDetailReadOnly(true);
                    }}
                    defaultProfessionalId={selectedBlock?.professional_id}
                />

                {/* Month Summary Popover */}
                {monthPopover && (
                    <>
                        <div 
                            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]" 
                            onClick={() => setMonthPopover(null)} 
                        />
                        <div 
                            className="fixed z-[70] month-summary-popover bg-white rounded-xl shadow-2xl border border-gray-100 p-4 min-w-[320px] max-w-[90vw] md:max-w-[450px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        >
                            <div className="flex justify-between items-center mb-4 pb-2 border-bottom border-gray-50">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">{monthPopover.title}</h4>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{format(monthPopover.date, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
                                </div>
                                <button 
                                    onClick={() => setMonthPopover(null)}
                                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                {monthPopover.events.length > 0 ? (
                                    monthPopover.events.map((ev, idx) => {
                                        const isBlock = ev.type === 'block' || ev.type === 'block-banner';
                                        
                                        if (isBlock) {
                                            const isAllDay = format(ev.start, 'HH:mm') === '00:00' && (format(ev.end, 'HH:mm') === '23:59' || format(ev.end, 'HH:mm') === '00:00');
                                            
                                            return (
                                                <div 
                                                    key={idx}
                                                    onClick={() => {
                                                        setMonthPopover(null);
                                                        handleSelectEvent(ev);
                                                    }}
                                                    className="flex items-center justify-between p-2 hover:bg-red-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-red-100"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-red-900">
                                                            {ev.title || 'Bloqueio de Horário'}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 rounded border border-red-100">
                                                                {isAllDay ? 'DIA INTEIRO' : `${format(ev.start, 'HH:mm')} – ${format(ev.end, 'HH:mm')}`}
                                                            </span>
                                                            <span className="text-[9px] font-black uppercase px-1.5 rounded py-0.5 bg-red-600 text-white shadow-sm">
                                                                BLOQUEIO
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="material-symbols-outlined text-red-300 text-sm">chevron_right</span>
                                                </div>
                                            );
                                        }

                                        const statusLabelMap: Record<string, string> = {
                                            'scheduled': 'Agendado',
                                            'confirmed': 'Confirmado',
                                            'completed': 'Realizado',
                                            'cancelled': 'Cancelado',
                                            'no_show': 'Falta',
                                            'rescheduled': 'Remarcado'
                                        };
                                        
                                        const statusColorMap: Record<string, string> = {
                                            'scheduled': 'bg-blue-50 text-blue-600',
                                            'confirmed': 'bg-green-50 text-green-600',
                                            'completed': 'bg-gray-50 text-gray-600',
                                            'cancelled': 'bg-red-50 text-red-600',
                                            'no_show': 'bg-slate-50 text-slate-600',
                                            'rescheduled': 'bg-purple-50 text-purple-600'
                                        };

                                        const status = ev.resource?.status || 'scheduled';

                                        return (
                                            <div 
                                                key={idx}
                                                onClick={() => {
                                                    setMonthPopover(null);
                                                    handleSelectEvent(ev);
                                                }}
                                                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-100"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-gray-800">
                                                        {ev.resource?.patient?.name || 'Paciente s/ nome'}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-1.5 rounded">
                                                            {format(ev.start, 'HH:mm')} – {format(ev.end, 'HH:mm')}
                                                        </span>
                                                        <span className={`text-[9px] font-bold uppercase px-1.5 rounded py-0.5 ${statusColorMap[status] || 'bg-gray-50'}`}>
                                                            {statusLabelMap[status] || status}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="material-symbols-outlined text-gray-400 text-sm">chevron_right</span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-xs text-gray-400 text-center py-4 italic">Nenhum item encontrado.</p>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setMonthPopover(null);
                                    setView(Views.DAY);
                                    setDate(monthPopover.date);
                                }}
                                className="w-full mt-4 py-2 text-[10px] font-bold text-primary uppercase tracking-widest hover:bg-primary/5 rounded-lg border border-dashed border-primary/20 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">calendar_view_day</span>
                                Ver Visualização do Dia
                            </button>
                        </div>
                    </>
                )}
            </main>

            {/* Interstitial Block Conflict Modal */}
            {interstitialModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-red-600">block</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Conflito com Bloqueio</h3>
                            <p className="text-gray-600 mb-6">
                                Este horário está bloqueado pelo(a) <strong>
                                    {interstitialModal.block?.is_clinic_wide 
                                        ? 'clínica' 
                                        : (professionals.find(p => p.id == interstitialModal.block?.professional_id)?.name || 'profissional escolhido')}
                                </strong>. 
                                O que deseja fazer?
                            </p>
                            
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        const slot = interstitialModal.slot;
                                        setInterstitialModal({ isOpen: false });
                                        if (slot) proceedWithSlotSelection(slot);
                                    }}
                                    className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">calendar_add_on</span>
                                    Agendar mesmo assim
                                </button>
                                
                                <button
                                    onClick={() => {
                                        const block = interstitialModal.block;
                                        setInterstitialModal({ isOpen: false });
                                        openBlockModal(block);
                                    }}
                                    className="w-full py-3 bg-gray-100 text-gray-900 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">edit_calendar</span>
                                    Alterar Bloqueio
                                </button>
                                
                                <button
                                    onClick={() => setInterstitialModal({ isOpen: false })}
                                    className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                onEditAppointment={(appt) => {
                    const event = {
                        id: appt.id,
                        resource: appt,
                        start: new Date(appt.start_time),
                        end: new Date(appt.end_time)
                    };
                    openAppointmentModal(undefined, event, false);
                }}
                onViewAppointment={(appt) => {
                    const event = {
                        id: appt.id,
                        resource: appt,
                        start: new Date(appt.start_time),
                        end: new Date(appt.end_time)
                    };
                    openAppointmentModal(undefined, event, true);
                }}
            />
            {/* Extract Modal */}
            <ProfessionalExtractModal
                isOpen={isExtractOpen}
                onClose={() => setIsExtractOpen(false)}
                professionals={professionals}
            />

            {/* Conflict Detail Modal - Opens over everything to allow return */}
            {conflictDetailAppt && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
                    <AppointmentModal
                        isOpen={true}
                        onClose={() => setConflictDetailAppt(null)}
                        onSuccess={() => {
                            setConflictDetailAppt(null);
                            fetchAppointments();
                        }}
                        patients={patients}
                        procedures={procedures}
                        professionals={professionals}
                        initialEvent={{
                            id: conflictDetailAppt.id,
                            resource: conflictDetailAppt,
                            start: new Date(conflictDetailAppt.start_time),
                            end: new Date(conflictDetailAppt.end_time)
                        }}
                        clinicId={clinicId}
                        isReadOnly={isConflictDetailReadOnly}
                    />
                </div>
            )}
        </div>
    );
};

export default Agenda;
