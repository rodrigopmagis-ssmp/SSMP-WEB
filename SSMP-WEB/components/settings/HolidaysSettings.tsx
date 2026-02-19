import React, { useState } from 'react';
import { useHolidays } from '../../src/hooks/useHolidays';
import Toast from '../ui/Toast';

interface HolidaysSettingsProps {
    clinicId: string;
}

const HolidaysSettings: React.FC<HolidaysSettingsProps> = ({ clinicId }) => {
    const { holidays, loading, addHoliday, deleteHoliday } = useHolidays(clinicId);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean } | null>(null);
    const [newHoliday, setNewHoliday] = useState({ date: '', description: '' });
    const [isAdding, setIsAdding] = useState(false);

    const handleAddHoliday = async () => {
        if (!newHoliday.date || !newHoliday.description) {
            setToast({ message: 'Preencha todos os campos', type: 'error', visible: true });
            return;
        }

        try {
            setIsAdding(true);
            await addHoliday(newHoliday.date, newHoliday.description);
            setNewHoliday({ date: '', description: '' });
            setToast({ message: 'Feriado adicionado com sucesso!', type: 'success', visible: true });
        } catch (error) {
            setToast({ message: 'Erro ao adicionar feriado', type: 'error', visible: true });
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteHoliday = async (id: string) => {
        if (!confirm('Deseja realmente remover este feriado?')) return;

        try {
            await deleteHoliday(id);
            setToast({ message: 'Feriado removido com sucesso!', type: 'success', visible: true });
        } catch (error) {
            setToast({ message: 'Erro ao remover feriado', type: 'error', visible: true });
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    if (loading) {
        return <div className="p-4 text-center text-gray-500">Carregando feriados...</div>;
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
                Feriados e fechamentos
            </h3>

            {/* Add Holiday Form */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="holiday-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Data
                        </label>
                        <input
                            id="holiday-date"
                            type="date"
                            value={newHoliday.date}
                            onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm focus:border-purple-500 outline-none"
                        />
                    </div>

                    <div>
                        <label htmlFor="holiday-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Descrição
                        </label>
                        <input
                            id="holiday-description"
                            type="text"
                            value={newHoliday.description}
                            onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                            placeholder="Ex: Natal, Ano Novo, etc."
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm focus:border-purple-500 outline-none"
                        />
                    </div>
                </div>

                <button
                    onClick={handleAddHoliday}
                    disabled={isAdding}
                    className="w-full md:w-auto px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isAdding ? (
                        <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    ) : (
                        <span className="material-symbols-outlined text-sm">add</span>
                    )}
                    Adicionar feriado
                </button>
            </div>

            {/* Holidays List */}
            {holidays.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {holidays.length} {holidays.length === 1 ? 'feriado cadastrado' : 'feriados cadastrados'}
                    </p>

                    <div className="space-y-2">
                        {holidays.map(holiday => (
                            <div
                                key={holiday.id}
                                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {holiday.description}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatDate(holiday.date)}
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleDeleteHoliday(holiday.id)}
                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                                    title="Remover feriado"
                                >
                                    <span className="material-symbols-outlined text-gray-400 group-hover:text-red-500 text-lg">
                                        delete
                                    </span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    <span className="material-symbols-outlined text-4xl mb-2 block">event_busy</span>
                    <p className="text-sm">Nenhum feriado cadastrado</p>
                </div>
            )}
        </div>
    );
};

export default HolidaysSettings;
