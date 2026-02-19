import React, { useEffect, useRef } from 'react';
import { format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CustomAgendaProps {
    events: any[];
    date: Date;
    onNavigate: (date: Date) => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'confirmed': return { bg: 'bg-green-100', border: 'border-green-500', dot: 'bg-green-500', text: 'text-green-700' };
        case 'completed': return { bg: 'bg-gray-100', border: 'border-gray-500', dot: 'bg-gray-500', text: 'text-gray-700' };
        case 'cancelled': return { bg: 'bg-red-100', border: 'border-red-500', dot: 'bg-red-500', text: 'text-red-700' };
        case 'no_show': return { bg: 'bg-gray-800', border: 'border-gray-900', dot: 'bg-gray-900', text: 'text-white' };
        case 'rescheduled': return { bg: 'bg-purple-100', border: 'border-purple-500', dot: 'bg-purple-500', text: 'text-purple-700' };
        default: return { bg: 'bg-blue-100', border: 'border-blue-500', dot: 'bg-blue-500', text: 'text-blue-700' };
    }
};

const CustomAgenda: React.FC<CustomAgendaProps> = ({ events, date }) => {
    // Filter events to show only from selected date onwards (or just group all passsed events?)
    // Usually Agenda view shows upcoming events from the selected date.
    // Let's filter events starting from 'date' (start of day).

    // However, react-big-calendar usually passes a range. 
    // In Agenda.tsx, we fetch a whole month. 
    // Let's just group ALL events passed to us, assuming the parent controller handles fetching.
    // But we should probably look at the 'date' prop and maybe scroll to it or prioritize it.
    // For now, let's just group all valid events.

    // 1. Group events by day
    const groupedEvents: Record<string, any[]> = {};

    // Sort events by date/time
    const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

    sortedEvents.forEach(event => {
        const dateKey = startOfDay(event.start).toISOString();
        if (!groupedEvents[dateKey]) {
            groupedEvents[dateKey] = [];
        }
        groupedEvents[dateKey].push(event);
    });

    // 2. Get sorted dates
    const sortedDates = Object.keys(groupedEvents).sort();

    // 3. Filter to show only dates >= selected date (optional, but typical for Agenda view)
    // If we want to show everything fetched (month), we can just show all. 
    // Let's show all for now as the user might want to see past events in the current view range.

    // Refs for scrolling
    const containerRef = useRef<HTMLDivElement>(null);
    const dateRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Scroll to date when it changes
    useEffect(() => {
        if (!date || !containerRef.current) return;

        // Find the closest date group to the selected date
        // Since groupedEvents keys are ISO strings of start of day
        const targetKey = startOfDay(date).toISOString();

        const element = dateRefs.current[targetKey];

        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            // If exact date not found, maybe find the next closest one?
            // For now, let's just try to scroll to the exact match.
            // If they click on a day with no events, nothing happens, which is acceptable or standard behavior.
            // Alternatively, we could scroll to the closest following date.

            const sortedKeys = Object.keys(groupedEvents).sort();
            const nextKey = sortedKeys.find(key => key >= targetKey);

            if (nextKey && dateRefs.current[nextKey]) {
                dateRefs.current[nextKey]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, [date, groupedEvents]);

    return (
        <div ref={containerRef} className="h-full overflow-y-auto bg-white p-4 scroll-smooth">
            {sortedDates.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                    Nenhum agendamento encontrado para este período.
                </div>
            ) : (
                sortedDates.map(dateKey => {
                    const groupDate = parseISO(dateKey);
                    const groupEvents = groupedEvents[dateKey];

                    // Format: "18 de fevereiro de 2026, quarta-feira"
                    // First part: day
                    const day = format(groupDate, 'dd', { locale: ptBR });
                    const rest = format(groupDate, " 'de' MMMM 'de' yyyy, eeee", { locale: ptBR });

                    // Check if it's today
                    const isToday = isSameDay(groupDate, new Date());

                    return (
                        <div
                            key={dateKey}
                            ref={el => dateRefs.current[dateKey] = el}
                            className="mb-8"
                            id={`date-${dateKey}`}
                        >
                            <div className="flex items-baseline gap-2 mb-3 border-b border-gray-100 pb-2">
                                <span className={`text-2xl font-bold ${isToday ? 'text-primary' : 'text-gray-800'}`}>
                                    {day}
                                </span>
                                <span className="text-sm text-gray-500 capitalize">
                                    {rest}
                                </span>
                                {isToday && (
                                    <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                                        Hoje
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3">
                                {groupEvents.map(event => {
                                    if (event.type === 'holiday') {
                                        return (
                                            <div key={event.id} className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-md flex items-center gap-3">
                                                <span className="material-symbols-outlined text-amber-600">celebration</span>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-amber-900">{event.title}</span>
                                                    <span className="text-xs text-amber-700">Feriado</span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (event.type === 'block' || event.type === 'block-banner') {
                                        return (
                                            <div key={event.id} className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r-md flex items-center gap-3 opacity-70">
                                                <span className="material-symbols-outlined text-red-600">block</span>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-red-900">{event.title}</span>
                                                    <span className="text-xs text-red-700">
                                                        {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    const appt = event.resource;
                                    const status = appt.status || 'scheduled';
                                    const colors = getStatusColor(status);
                                    const professionalName = appt.professional?.full_name || 'Profissional não atribuído';
                                    const procedureName = appt.type || appt.title || 'Consulta'; // AgendaService maps title to title, type to type using resource

                                    return (
                                        <div
                                            key={event.id}
                                            className={`relative flex flex-col p-3 rounded-r-md border-l-4 ${colors.border} ${colors.bg} hover:shadow-md transition-shadow`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                                                <span className="font-semibold text-gray-900 text-sm">
                                                    {professionalName}
                                                </span>
                                            </div>

                                            <div className="pl-4">
                                                <div className="text-gray-700 text-sm mb-1 font-medium">
                                                    {procedureName}
                                                </div>
                                                <div className="text-gray-500 text-xs flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                    {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default CustomAgenda;
