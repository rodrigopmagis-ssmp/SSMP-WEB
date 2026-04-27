import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MiniCalendarProps {
    currentDate: Date;
    onDateSelect: (date: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ currentDate, onDateSelect }) => {
    // viewDate control which month is being displayed
    const [viewDate, setViewDate] = useState(startOfMonth(currentDate));
    
    // Sincronizar o mini calendário quando a data principal mudar (ex: navegação externa)
    useEffect(() => {
        setViewDate(startOfMonth(currentDate));
    }, [currentDate]);

    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = monthStart.getDay();

    // Create array with empty slots for days before month starts
    const calendarDays = Array(firstDayOfWeek).fill(null).concat(daysInMonth);

    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(subMonths(viewDate, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(addMonths(viewDate, 1));
    };

    return (
        <div className="bg-white rounded-lg p-3 select-none">
            <div className="flex items-center justify-between mb-3 px-1">
                <button 
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <h3 className="text-sm font-bold text-gray-700 capitalize">
                    {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
                </h3>
                <button 
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
            </div>

            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day, index) => (
                    <div key={index} className="text-center text-[10px] font-semibold text-gray-400">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                    if (!day) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const isSelected = isSameDay(day, currentDate);
                    const isTodayDate = isToday(day);
                    const isCurrentMonth = isSameMonth(day, viewDate);

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => onDateSelect(day)}
                            className={`
                                aspect-square rounded-md text-[11px] font-medium transition-all flex items-center justify-center relative
                                ${!isCurrentMonth ? 'text-gray-300' : (isSelected ? 'text-white' : (isTodayDate ? 'text-primary' : 'text-gray-700'))}
                                ${isSelected ? 'bg-primary shadow-md scale-110 z-10' : 'bg-transparent hover:bg-primary/10 hover:text-primary'}
                                ${isTodayDate ? 'ring-1 ring-primary/40' : ''}
                            `}
                        >
                            {format(day, 'd')}
                            {isTodayDate && (
                                <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MiniCalendar;
