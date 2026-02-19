import React, { useState, useEffect } from 'react';
import { useBusinessHours, TimeRange } from '../../src/hooks/useBusinessHours';
import Toast from '../ui/Toast';

interface BusinessHoursSettingsProps {
    clinicId: string;
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' }
];

const BusinessHoursSettings: React.FC<BusinessHoursSettingsProps> = ({ clinicId }) => {
    const { businessHours, loading, updateBusinessHours, getBusinessHoursForDay } = useBusinessHours(clinicId);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean } | null>(null);
    const [localHours, setLocalHours] = useState<Record<number, { isActive: boolean; timeRanges: TimeRange[] }>>({});
    const [editingDays, setEditingDays] = useState<Record<number, boolean>>({});

    useEffect(() => {
        // Initialize local state from fetched business hours
        const initial: Record<number, { isActive: boolean; timeRanges: TimeRange[] }> = {};

        DAYS_OF_WEEK.forEach(day => {
            const hours = getBusinessHoursForDay(day.value);
            initial[day.value] = {
                isActive: hours?.is_active || false,
                timeRanges: hours?.time_ranges.length ? hours.time_ranges : [{ start: '09:00', end: '18:00' }]
            };
        });

        setLocalHours(initial);
    }, [businessHours]);

    const handleToggleDay = async (dayOfWeek: number) => {
        const current = localHours[dayOfWeek];
        const newIsActive = !current.isActive;

        // Save to database for both enabling and disabling
        try {
            await updateBusinessHours(dayOfWeek, current.timeRanges, newIsActive);
            setLocalHours(prev => ({
                ...prev,
                [dayOfWeek]: { ...prev[dayOfWeek], isActive: newIsActive }
            }));
            const message = newIsActive ? 'Dia habilitado com sucesso!' : 'Dia desabilitado com sucesso!';
            setToast({ message, type: 'success', visible: true });
        } catch (error) {
            const message = newIsActive ? 'Erro ao habilitar dia' : 'Erro ao desabilitar dia';
            setToast({ message, type: 'error', visible: true });
        }
    };

    const handleTimeChange = (dayOfWeek: number, rangeIndex: number, field: 'start' | 'end', value: string) => {
        setLocalHours(prev => {
            const newRanges = [...prev[dayOfWeek].timeRanges];
            newRanges[rangeIndex] = { ...newRanges[rangeIndex], [field]: value };
            return {
                ...prev,
                [dayOfWeek]: { ...prev[dayOfWeek], timeRanges: newRanges }
            };
        });
    };

    const handleAddTimeRange = (dayOfWeek: number) => {
        setLocalHours(prev => ({
            ...prev,
            [dayOfWeek]: {
                ...prev[dayOfWeek],
                timeRanges: [...prev[dayOfWeek].timeRanges, { start: '14:00', end: '18:00' }]
            }
        }));
    };

    const handleRemoveTimeRange = (dayOfWeek: number, rangeIndex: number) => {
        setLocalHours(prev => {
            const newRanges = prev[dayOfWeek].timeRanges.filter((_, i) => i !== rangeIndex);
            return {
                ...prev,
                [dayOfWeek]: { ...prev[dayOfWeek], timeRanges: newRanges.length ? newRanges : [{ start: '09:00', end: '18:00' }] }
            };
        });
    };

    const handleSaveTimeRanges = async (dayOfWeek: number) => {
        try {
            const current = localHours[dayOfWeek];
            await updateBusinessHours(dayOfWeek, current.timeRanges, current.isActive);
            setEditingDays(prev => ({ ...prev, [dayOfWeek]: false }));
            setToast({ message: 'Horários salvos com sucesso!', type: 'success', visible: true });
        } catch (error) {
            setToast({ message: 'Erro ao salvar horários', type: 'error', visible: true });
        }
    };

    const handleEditDay = (dayOfWeek: number) => {
        setEditingDays(prev => ({ ...prev, [dayOfWeek]: true }));
    };

    if (loading) {
        return <div className="p-4 text-center text-gray-500">Carregando horários...</div>;
    }

    return (
        <div className="space-y-4">
            {toast && toast.visible && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Horários de funcionamento
            </h3>

            <div className="space-y-3">
                {DAYS_OF_WEEK.map(day => {
                    const dayHours = localHours[day.value];
                    if (!dayHours) return null;

                    return (
                        <div key={day.value} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                            {/* Day Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {day.label}
                                </span>
                                <button
                                    onClick={() => handleToggleDay(day.value)}
                                    aria-label={dayHours.isActive ? `Disable ${day.label}` : `Enable ${day.label}`}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${dayHours.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dayHours.isActive ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Time Ranges */}
                            {dayHours.isActive && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    {dayHours.timeRanges.map((range, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                aria-label={`Hora de início para ${day.label}`}
                                                value={range.start}
                                                onChange={(e) => handleTimeChange(day.value, index, 'start', e.target.value)}
                                                disabled={!editingDays[day.value]}
                                                className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <span className="text-gray-400">até</span>
                                            <input
                                                type="time"
                                                aria-label={`Hora de término para ${day.label}`}
                                                value={range.end}
                                                onChange={(e) => handleTimeChange(day.value, index, 'end', e.target.value)}
                                                disabled={!editingDays[day.value]}
                                                className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            />

                                            {dayHours.timeRanges.length > 1 && editingDays[day.value] && (
                                                <button
                                                    onClick={() => handleRemoveTimeRange(day.value, index)}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    title="Remover período"
                                                >
                                                    <span className="material-symbols-outlined text-gray-400 text-lg">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    <div className="flex gap-2 pt-2">
                                        {editingDays[day.value] && (
                                            <button
                                                onClick={() => handleAddTimeRange(day.value)}
                                                className="text-sm text-purple-600 dark:text-purple-400 font-medium hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-sm">add</span>
                                                Adicionar
                                            </button>
                                        )}

                                        {!editingDays[day.value] ? (
                                            <button
                                                onClick={() => handleEditDay(day.value)}
                                                className="ml-auto text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors font-medium"
                                            >
                                                Editar
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleSaveTimeRanges(day.value)}
                                                className="ml-auto text-sm bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors font-medium"
                                            >
                                                Salvar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BusinessHoursSettings;
