import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendaService, Appointment } from '../../services/AgendaService';

interface ProfessionalExtractModalProps {
    isOpen: boolean;
    onClose: () => void;
    professionals: { id: string; full_name: string; phone?: string }[];
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
    const [isSending, setIsSending] = useState(false);
    const [step, setStep] = useState<'idle' | 'confirming' | 'success'>('idle');

    // Reset step when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('idle');
        }
    }, [isOpen]);

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

    const handleSendWhatsApp = async () => {
        if (!selectedProfessionalId || isSending) return;

        const { start, end } = getPeriodDates();

        const periodStr = periodType === 'today' ? 'Hoje' :
            periodType === 'tomorrow' ? 'Amanhã' :
                periodType === 'week' ? `Semana ${format(start, 'dd/MM')} a ${format(end, 'dd/MM')}` :
                    `${format(start, 'dd/MM')} a ${format(end, 'dd/MM')}`;

        const professional = professionals.find(p => p.id === selectedProfessionalId);
        const professionalName = professional?.full_name.split(' ')[0].toUpperCase() || 'PROFISSIONAL';

        const counts = {
            total: appointments.length,
            confirmed: appointments.filter(a => a.status === 'confirmed' || a.status === 'completed').length,
            pending: appointments.filter(a => a.status !== 'confirmed' && a.status !== 'completed').length,
        };

        let message = `🗓️ *EXTRATO DE AGENDA*\n`;
        message += `*Período:* ${periodStr}\n`;
        message += `Olá, *${professionalName}*\n`;
        message += `--------------------------\n\n`;

        message += `📊 *RESUMO*\n`;
        message += ` * Total: ${counts.total}\n`;
        message += ` * Confirmados: ${counts.confirmed}\n`;
        message += ` * Pendentes: ${counts.pending}\n`;
        message += `--------------------------\n\n`;

        message += `📝 *DETALHAMENTO*\n\n`;

        if (appointments.length === 0) {
            message += "_Nenhum agendamento encontrado para este período._";
        } else {
            // Group by date
            const grouped: Record<string, Appointment[]> = {};
            appointments.forEach(appt => {
                const dateKey = format(new Date(appt.start_time), 'yyyy-MM-dd');
                if (!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push(appt);
            });

            const sortedDates = Object.keys(grouped).sort();
            let apptIndex = 1;

            sortedDates.forEach(dateKey => {
                const dateObj = new Date(dateKey + 'T12:00:00');
                const dateHeader = format(dateObj, 'dd/MM (EEEE)', { locale: ptBR }).toUpperCase();
                
                message += `*${dateHeader}*\n\n`;

                grouped[dateKey].forEach(appt => {
                    const timeStr = format(new Date(appt.start_time), 'HH:mm');
                    const indexStr = String(apptIndex).padStart(2, '0');
                    const statusLabel = 
                        appt.status === 'confirmed' ? 'Confirmado' :
                        appt.status === 'completed' ? 'Realizado' : 'Agendado';
                    
                    message += `*[${indexStr}] - ${timeStr} | ${appt.patient?.name} (${statusLabel})*\n`;
                    if (appt.procedure?.name) {
                        message += `_Procedimento: ${appt.procedure.name}_\n`;
                    }
                    message += `\n`;
                    apptIndex++;
                });
            });
        }

        if (step === 'idle') {
            setStep('confirming');
            return;
        }

        setIsSending(true);

        try {
            const webhookUrl = 'https://n8n360.navegar360.com.br/webhook/envio-termo';
            const apiKey = import.meta.env.VITE_N8N_API_KEY || 'aesthetic-secret-key-123';
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    to: professional?.phone?.replace(/\D/g, '') || '',
                    message: message,
                    professional_id: selectedProfessionalId,
                    professional_name: professional?.full_name,
                    period: periodStr,
                    appointments_count: counts.total,
                    type: 'extract'
                }),
            });

            if (!response.ok) {
                throw new Error('Falha ao enviar extrato via webhook');
            }

            setStep('success');
        } catch (error) {
            console.error('Error sending webhook:', error);
            const encodedMessage = encodeURIComponent(message);
            const link = professional?.phone
                ? `https://api.whatsapp.com/send?phone=${professional.phone.replace(/\D/g, '')}&text=${encodedMessage}`
                : `https://api.whatsapp.com/send?text=${encodedMessage}`;
            window.open(link, '_blank');
        } finally {
            setIsSending(false);
        }
    };

    const handleCopyText = () => {
        // Logic similar to WhatsApp but copy to clipboard
        // For brevity, skipping implementation detail here, focusing on Whatsapp as requested primarily.
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-6xl flex flex-col max-h-[90vh]">

                {step === 'confirming' ? (
                    <div className="py-12 px-8 flex flex-col items-center text-center max-w-md mx-auto">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <svg viewBox="0 0 24 24" className="w-10 h-10 fill-green-600">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-3">Confirmar Envio</h2>
                        <p className="text-sm text-gray-500 mb-10 leading-relaxed">
                            Deseja enviar o extrato de <span className="font-bold text-gray-700">{appointments.length} agendamentos</span> para o profissional <span className="font-bold text-gray-900">{professionals.find(p => p.id === selectedProfessionalId)?.full_name}</span>?
                        </p>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setStep('idle')}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSendWhatsApp}
                                disabled={isSending}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#25D366] hover:bg-[#128C7E] rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSending ? 'Enviando...' : 'Confirmar e Enviar'}
                            </button>
                        </div>
                    </div>
                ) : step === 'success' ? (
                    <div className="py-12 px-8 flex flex-col items-center text-center max-w-md mx-auto">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-green-700 text-3xl font-bold">check_circle</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-3">Enviado com Sucesso!</h2>
                        <p className="text-sm text-gray-500 mb-10 leading-relaxed">
                            O extrato da agenda foi enviado com sucesso para o WhatsApp do profissional.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors shadow-sm"
                        >
                            Concluir
                        </button>
                    </div>
                ) : (
                    <>
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
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                        {/* Agendado */}
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400">
                                                <span className="material-symbols-outlined text-3xl">calendar_today</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Agendado</span>
                                                <div className="text-3xl font-bold text-slate-700 leading-tight">
                                                    {appointments.filter(a => a.status === 'scheduled' || a.status === 'rescheduled').length}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Confirmado */}
                                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-400">
                                                <span className="material-symbols-outlined text-3xl">check_circle</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Confirmado</span>
                                                <div className="text-3xl font-bold text-slate-700 leading-tight">
                                                    {appointments.filter(a => a.status === 'confirmed').length}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Não Compareceu */}
                                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 shadow-sm flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-orange-400">
                                                <span className="material-symbols-outlined text-3xl">warning</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Não Compareceu</span>
                                                <div className="text-3xl font-bold text-slate-700 leading-tight">
                                                    {appointments.filter(a => a.status === 'no_show').length}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Concluído */}
                                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-400">
                                                <span className="material-symbols-outlined text-3xl">bar_chart</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Concluído</span>
                                                <div className="text-3xl font-bold text-slate-700 leading-tight">
                                                    {appointments.filter(a => a.status === 'completed').length}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cancelado */}
                                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-400">
                                                <span className="material-symbols-outlined text-3xl">cancel</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Cancelado</span>
                                                <div className="text-3xl font-bold text-slate-700 leading-tight">
                                                    {appointments.filter(a => a.status === 'cancelled').length}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Total */}
                                        <div className="bg-green-50 p-4 rounded-2xl border-2 border-green-200 shadow-sm flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-green-500">
                                                <span className="material-symbols-outlined text-3xl font-bold">check_circle</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Total</span>
                                                <div className="text-3xl font-bold text-slate-900 leading-tight">
                                                    {appointments.length}
                                                </div>
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
                                                    <div key={appt.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
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
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase
                                                                        ${appt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                                            appt.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                                                                appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                                                    'bg-blue-100 text-blue-700'}`}
                                                                    >
                                                                        {appt.status === 'confirmed' ? 'Confirmado' :
                                                                            appt.status === 'completed' ? 'Realizado' :
                                                                                appt.status === 'cancelled' ? 'Cancelado' : 'Agendado'}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500 font-mono">
                                                                        {format(new Date(appt.start_time), 'HH:mm')}
                                                                    </span>
                                                                </div>
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
                                disabled={!selectedProfessionalId || loading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#25D366] hover:bg-[#128C7E] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                <i className="fa-brands fa-whatsapp text-lg"></i>
                                <span>Enviar Extrato</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProfessionalExtractModal;
