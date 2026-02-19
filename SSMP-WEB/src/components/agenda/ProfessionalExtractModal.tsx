import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendaService, Appointment } from '../../services/AgendaService';
import { supabase } from '../../lib/supabase';

interface ProfessionalExtractModalProps {
    isOpen: boolean;
    onClose: () => void;
    professionals: { id: string; full_name: string }[];
}

const ProfessionalExtractModal: React.FC<ProfessionalExtractModalProps> = ({ isOpen, onClose, professionals }) => {
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
    const [periodType, setPeriodType] = useState<'today' | 'tomorrow' | 'week' | 'month' | 'custom'>('today');
    const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [professionalPhone, setProfessionalPhone] = useState<string | null>(null);

    // Calculate period dates
    const getPeriodDates = useCallback(() => {
        const today = new Date();
        switch (periodType) {
            case 'today':
                return { start: startOfDay(today), end: endOfDay(today) };
            case 'tomorrow':
                const tomorrow = addDays(today, 1);
                return { start: startOfDay(tomorrow), end: endOfDay(tomorrow) };
            case 'week':
                return { start: startOfWeek(today, { weekStartsOn: 0 }), end: endOfWeek(today, { weekStartsOn: 0 }) };
            case 'month':
                // Assuming "This Month" logic similar to report or just next 30 days? 
                // Let's use simple start/end of current month for "Mês" context usually implies current month view
                // OR maybe simple 30 days. Let's stick to current month for consistency.
                const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
                return { start: startMonth, end: endMonth };
            case 'custom':
                return {
                    start: startOfDay(new Date(customRange.start)),
                    end: endOfDay(new Date(customRange.end))
                };
            default:
                return { start: startOfDay(today), end: endOfDay(today) };
        }
    }, [periodType, customRange]);

    // Fetch professional details (phone)
    useEffect(() => {
        if (selectedProfessionalId) {
            // In a real app, we might need to fetch the profile to get the phone number
            // For now, assuming we might not have it in the simple list props, so let's try to fetch if needed
            // Or just check if 'professionals' prop has it. The prop is {id, full_name}.
            // So let's fetch profile.
            const fetchProfile = async () => {
                const { data } = await supabase
                    .from('profiles')
                    .select('phone') // Assuming 'phone' exists in profiles
                    .eq('id', selectedProfessionalId)
                    .single();
                if (data) setProfessionalPhone(data.phone);
            };
            fetchProfile();
        } else {
            setProfessionalPhone(null);
        }
    }, [selectedProfessionalId]);

    // Fetch appointments
    useEffect(() => {
        if (isOpen && selectedProfessionalId) {
            const fetch = async () => {
                setLoading(true);
                try {
                    const { start, end } = getPeriodDates();
                    // Reusing AgendaService.getAppointments which takes (start, end, professionalId)
                    const data = await AgendaService.getAppointments(start, end, selectedProfessionalId);
                    // Sort by time
                    const sorted = data.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                    setAppointments(sorted);
                } catch (error) {
                    console.error("Error fetching extract:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetch();
        } else if (!selectedProfessionalId) {
            setAppointments([]);
        }
    }, [isOpen, selectedProfessionalId, getPeriodDates]);

    // Format for WhatsApp
    const handleSendWhatsApp = () => {
        if (!selectedProfessionalId) return; // Keep original check for professional selection

        const { start, end } = getPeriodDates(); // Define start and end here

        const periodStr = periodType === 'today' ? 'Hoje' :
            periodType === 'tomorrow' ? 'Amanhã' :
                periodType === 'week' ? `Semana ${format(start, 'dd/MM')} a ${format(end, 'dd/MM')}` :
                    `${format(start, 'dd/MM')} a ${format(end, 'dd/MM')}`;

        const professionalName = professionals.find(p => p.id === selectedProfessionalId)?.full_name.split(' ')[0].toUpperCase() || 'PROFISSIONAL';

        const counts = {
            total: appointments.length,
            confirmed: appointments.filter(a => a.status === 'confirmed').length,
            completed: appointments.filter(a => a.status === 'completed').length,
            scheduled: appointments.filter(a => a.status === 'scheduled').length,
        };

        // Emojis for safe encoding
        const EMOJI_CHART = String.fromCodePoint(0x1F4CA);
        const EMOJI_CHECK = String.fromCodePoint(0x2705);
        const EMOJI_CALENDAR = String.fromCodePoint(0x1F4C5);
        const EMOJI_DONE = String.fromCodePoint(0x2611, 0xFE0F);
        const EMOJI_CLIPBOARD = String.fromCodePoint(0x1F4CB);
        const EMOJI_BLOCK = String.fromCodePoint(0x1F6AB);
        const EMOJI_CROSS = String.fromCodePoint(0x274C);
        const EMOJI_DOT = String.fromCodePoint(0x1F539);

        let message = `*Extrato da Agenda - ${periodStr}*\n`;
        message += `Olá, ${professionalName}!\n\n`;
        message += `${EMOJI_CHART} *Resumo:*\n`;
        message += `Total: ${counts.total}\n`;
        message += `${EMOJI_CHECK} Confirmados: ${counts.confirmed}\n`;
        message += `${EMOJI_CALENDAR} Agendados: ${counts.scheduled}\n`;
        message += `${EMOJI_DONE} Realizados: ${counts.completed}\n\n`;
        message += `${EMOJI_CLIPBOARD} *Detalhamento:*\n`;

        if (appointments.length === 0) {
            message += "_Nenhum agendamento encontrado para este período._";
        } else {
            // Group by day if period > 1 day
            const isSingleDay = isSameDay(start, end);

            let currentDay = '';

            appointments.forEach(appt => {
                const apptDate = new Date(appt.start_time);
                const dayStr = format(apptDate, 'dd/MM (EEEE)', { locale: ptBR });
                const timeStr = format(apptDate, 'HH:mm');
                const patientName = appt.patient?.name || 'Paciente';
                const statusEmoji =
                    appt.status === 'confirmed' ? EMOJI_CHECK :
                        appt.status === 'completed' ? EMOJI_DONE :
                            appt.status === 'cancelled' ? EMOJI_BLOCK :
                                appt.status === 'no_show' ? EMOJI_CROSS : EMOJI_CALENDAR;

                if (!isSingleDay && dayStr !== currentDay) {
                    message += `\n${EMOJI_DOT} *${dayStr}*\n`;
                    currentDay = dayStr;
                }

                message += `${timeStr} ${statusEmoji} ${patientName}\n`;
                if (appt.procedure?.name) message += `   _${appt.procedure.name}_\n`;
            });
        }

        const encodedMessage = encodeURIComponent(message);
        // Using professional phone if available, else standard wa.me link (user will choose contact)
        // Switch to api.whatsapp.com as it handles special chars/emojis better than wa.me
        const link = professionalPhone
            ? `https://api.whatsapp.com/send?phone=${professionalPhone.replace(/\D/g, '')}&text=${encodedMessage}`
            : `https://api.whatsapp.com/send?text=${encodedMessage}`;

        window.open(link, '_blank');
    };

    const handleCopyText = () => {
        // Logic similar to WhatsApp but copy to clipboard
        // For brevity, skipping implementation detail here, focusing on Whatsapp as requested primarily.
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Extrato por Profissional</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Filters */}
                <div className="p-6 border-b border-gray-100 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
                            <select
                                title="Selecione o profissional"
                                aria-label="Selecione o profissional"
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm"
                                value={selectedProfessionalId}
                                onChange={(e) => setSelectedProfessionalId(e.target.value)}
                            >
                                <option value="">Selecione um profissional...</option>
                                {professionals.map(p => (
                                    <option key={p.id} value={p.id}>{p.full_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                            <select
                                title="Selecione o período"
                                aria-label="Selecione o período"
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm"
                                value={periodType}
                                onChange={(e) => setPeriodType(e.target.value as any)}
                            >
                                <option value="today">Hoje</option>
                                <option value="tomorrow">Amanhã</option>
                                <option value="week">Esta Semana</option>
                                <option value="month">Este Mês</option>
                                <option value="custom">Personalizado</option>
                            </select>
                        </div>
                    </div>

                    {periodType === 'custom' && (
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                title="Data inicial"
                                aria-label="Data inicial"
                                type="date"
                                className="border-gray-300 rounded-lg text-sm"
                                value={customRange.start}
                                onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                            />
                            <span className="text-gray-500">até</span>
                            <input
                                title="Data final"
                                aria-label="Data final"
                                type="date"
                                className="border-gray-300 rounded-lg text-sm"
                                value={customRange.end}
                                onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {!selectedProfessionalId ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2">person_search</span>
                            <p>Selecione um profissional para visualizar o extrato</p>
                        </div>
                    ) : loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                    <span className="text-xs text-gray-500 font-medium uppercase">Total</span>
                                    <div className="text-2xl font-bold text-gray-900">{appointments.length}</div>
                                </div>
                                <div className="bg-green-50 p-3 rounded-xl border border-green-100 shadow-sm">
                                    <span className="text-xs text-green-600 font-medium uppercase">Confirmados</span>
                                    <div className="text-2xl font-bold text-green-700">
                                        {appointments.filter(a => a.status === 'confirmed').length}
                                    </div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 shadow-sm">
                                    <span className="text-xs text-blue-600 font-medium uppercase">Agendados</span>
                                    <div className="text-2xl font-bold text-blue-700">
                                        {appointments.filter(a => a.status === 'scheduled').length}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm">
                                    <span className="text-xs text-gray-500 font-medium uppercase">Realizados</span>
                                    <div className="text-2xl font-bold text-gray-700">
                                        {appointments.filter(a => a.status === 'completed').length}
                                    </div>
                                </div>
                            </div>

                            {/* List */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                                    <h3 className="text-sm font-medium text-gray-700">Detalhamento</h3>
                                </div>
                                {appointments.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        Nenhum agendamento encontrado neste período.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {appointments.map(appt => (
                                            <div key={appt.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                                                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 
                                                    ${appt.status === 'confirmed' ? 'bg-green-500' :
                                                        appt.status === 'cancelled' ? 'bg-red-500' :
                                                            appt.status === 'completed' ? 'bg-gray-500' : 'bg-blue-500'}`}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-sm font-medium text-gray-900 truncate">
                                                            {appt.patient?.name}
                                                        </span>
                                                        <span className="text-xs text-gray-500 font-mono">
                                                            {format(new Date(appt.start_time), 'HH:mm')}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {appt.procedure?.name || 'Consulta'}
                                                        {appt.description && <span className="ml-1 opacity-75">- {appt.description}</span>}
                                                    </p>
                                                    {periodType !== 'today' && periodType !== 'tomorrow' && (
                                                        <p className="text-[10px] text-gray-400 mt-1">
                                                            {format(new Date(appt.start_time), 'dd/MM/yyyy')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={handleSendWhatsApp}
                        disabled={!selectedProfessionalId}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#25D366] hover:bg-[#128C7E] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        <i className="fa-brands fa-whatsapp text-lg"></i> {/* Assuming font-awesome or similar, or use simple text/icon */}
                        <span>Enviar no WhatsApp</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfessionalExtractModal;
