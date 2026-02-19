import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MiniCalendarProps {
    currentDate: Date;
    onDateSelect: (date: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ currentDate, onDateSelect }) => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = monthStart.getDay();

    // Create array with empty slots for days before month starts
    const calendarDays = Array(firstDayOfWeek).fill(null).concat(daysInMonth);

    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    return (
        <div className="bg-white rounded-lg p-3">
            <h3 className="text-sm font-bold text-gray-700 mb-3 text-center">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h3>

            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day, index) => (
                    <div key={index} className="text-center text-xs font-semibold text-gray-500">
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

                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isSelected = isSameDay(day, currentDate);
                    const isTodayDate = isToday(day);

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => onDateSelect(day)}
                            className={`
                                aspect-square rounded-md text-xs font-medium transition-colors
                                ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                                ${isSelected ? 'bg-primary text-white' : 'hover:bg-gray-100'}
                                ${isTodayDate && !isSelected ? 'ring-1 ring-primary' : ''}
                            `}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MiniCalendar;
