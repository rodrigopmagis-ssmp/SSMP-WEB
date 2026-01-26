import { TimingUnit, DelayTiming, SpecificTiming } from '../../types';

export type SLAStatus = 'ontime' | 'warning' | 'late';

const WARNING_THRESHOLD_MINUTES = 15;

/**
 * Parses a timing config and returns the calculated due date based on the reference date (procedure date)
 */
export function calculateDueDate(
    referenceDate: string | Date,
    timing: { type: 'delay' | 'specific', delay?: DelayTiming, specific?: SpecificTiming },
    previousStageDate?: Date
): Date {
    const baseDate = new Date(referenceDate);
    const dueDate = new Date(baseDate);

    if (timing.type === 'delay' && timing.delay) {
        const { value, unit } = timing.delay;
        switch (unit) {
            case TimingUnit.MINUTES:
                dueDate.setMinutes(dueDate.getMinutes() + value);
                break;
            case TimingUnit.HOURS:
                dueDate.setHours(dueDate.getHours() + value);
                break;
            case TimingUnit.DAYS:
                dueDate.setDate(dueDate.getDate() + value);
                break;
            case TimingUnit.WEEKS:
                dueDate.setDate(dueDate.getDate() + (value * 7));
                break;
        }
    } else if (timing.type === 'specific' && timing.specific) {
        // Specific timing: e.g. "1 day after at 08:00"
        const { daysAfter, time } = timing.specific;
        const [hours, minutes] = time.split(':').map(Number);

        dueDate.setDate(dueDate.getDate() + daysAfter);
        dueDate.setHours(hours, minutes, 0, 0);
    }

    return dueDate;
}

/**
 * Determines the SLA status based on the due date and current time
 */
export function getSLAStatus(dueDate: Date): SLAStatus {
    const now = new Date();
    const diffMinutes = (dueDate.getTime() - now.getTime()) / (1000 * 60);

    if (diffMinutes < 0) {
        return 'late';
    } else if (diffMinutes <= WARNING_THRESHOLD_MINUTES) {
        return 'warning';
    } else {
        return 'ontime';
    }
}

/**
 * Formats the due date relative to today (e.g. "Hoje às 14:00", "Amanhã às 08:00", "25/01 às 08:00")
 */
export function formatDueDate(date: Date): string {
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.getDate() === tomorrow.getDate() && date.getMonth() === tomorrow.getMonth() && date.getFullYear() === tomorrow.getFullYear();

    const timeString = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Hoje às ${timeString}`;
    if (isTomorrow) return `Amanhã às ${timeString}`;
    return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${timeString}`;
}
