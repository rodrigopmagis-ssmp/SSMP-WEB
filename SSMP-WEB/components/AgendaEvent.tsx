import React from 'react';
import { Appointment } from '../src/services/AgendaService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Tooltip from '@radix-ui/react-tooltip';

interface AgendaEventProps {
    event: any; // Calendar event object
    title: string;
}

const AgendaEvent: React.FC<AgendaEventProps> = ({ event }) => {
    // Safety check: if event is null/undefined, don't render anything
    if (!event || !event.resource) return null;

    // Get the actual appointment data from event.resource
    const appointment: Appointment = event.resource;

    let startTime = '--:--';
    let endTime = '--:--';
    let patientName = 'Paciente desconhecido';
    let professionalName = 'Profissional não atribuído';
    let procedureName = 'Consulta';
    let statusColorClass = 'bg-blue-100 text-blue-800 border-blue-200';

    try {
        // Safe date formatting
        startTime = appointment.start_time ? format(new Date(appointment.start_time), 'HH:mm') : '';
        endTime = appointment.end_time ? format(new Date(appointment.end_time), 'HH:mm') : '';

        // Safe property access
        patientName = appointment.patient?.name || 'Paciente desconhecido';
        professionalName = appointment.professional?.full_name || 'Profissional não atribuído';
        procedureName = appointment.type || 'Consulta';

        // Status colors
        const statusColors = {
            scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
            confirmed: 'bg-green-100 text-green-800 border-green-200',
            completed: 'bg-gray-100 text-gray-800 border-gray-200',
            cancelled: 'bg-red-100 text-red-800 border-red-200',
            no_show: 'bg-gray-900 text-white border-gray-700',
        };

        statusColorClass = statusColors[appointment.status as keyof typeof statusColors] || statusColors.scheduled;
    } catch (e) {
        console.error("Error processing event data in AgendaEvent:", e, appointment);
        // If data processing fails, return a safe fallback
        return <div className="p-1 text-[10px] text-red-500 bg-red-50">Erro de dados</div>;
    }

    // Function to safely format date in tooltip
    const getFormattedDate = () => {
        try {
            return appointment.start_time ? format(new Date(appointment.start_time), "EEE, d 'de' MMM 'de' yyyy • HH:mm", { locale: ptBR }) : 'Data inválida';
        } catch (e) {
            return 'Data inválida';
        }
    };

    try {
        return (
            <Tooltip.Provider delayDuration={300}>
                <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                        <div className="h-full w-full flex flex-col justify-between p-1 text-xs leading-tight overflow-hidden">
                            {/* Conteúdo do Evento no Calendário (Compacto) */}
                            <span className="font-bold truncate">{patientName}</span>
                            <span className="text-[10px] opacity-80 mt-auto">{startTime} - {endTime}</span>
                        </div>
                    </Tooltip.Trigger>

                    <Tooltip.Portal>
                        <Tooltip.Content
                            className="z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-72 border border-gray-100 dark:border-gray-700 data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=delayed-open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=delayed-open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                            sideOffset={5}
                        >
                            <div className="flex flex-col gap-3">
                                {/* Cabeçalho */}
                                <div className="flex items-start gap-3">
                                    <div className={`w-3 h-3 mt-1.5 rounded-full ${statusColorClass.split(' ')[0].replace('bg-', 'bg-')}`}></div> {/* Indicador de cor simples */}
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">Agendamento</h4>
                                        <p className="text-xs text-gray-500 capitalize">
                                            {getFormattedDate()} - {endTime}
                                        </p>
                                    </div>
                                </div>

                                {/* Paciente */}
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs">
                                        {patientName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{patientName}</span>
                                </div>

                                {/* Profissional */}
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-xs">
                                        {professionalName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{professionalName}</span>
                                        {/* Ícone Whatsapp placeholder */}
                                        <span className="material-symbols-outlined text-[14px] text-green-500 cursor-pointer hover:text-green-600">chat</span>
                                    </div>
                                </div>

                                {/* Status e Procedimento */}
                                <div className="space-y-2 pl-11">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                                        <span className="capitalize">{event.status === 'scheduled' ? 'Agendado' : event.status}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="material-symbols-outlined text-[16px]">medical_services</span>
                                        <span>{procedureName}</span>
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <button className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors">
                                        Editar
                                    </button>
                                    <button className="flex-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded text-sm font-medium transition-colors">
                                        Ver detalhes
                                    </button>
                                </div>
                            </div>
                            <Tooltip.Arrow className="fill-white dark:fill-gray-800" />
                        </Tooltip.Content>
                    </Tooltip.Portal>
                </Tooltip.Root>
            </Tooltip.Provider>
        );
    } catch (e) {
        console.error("Error rendering Tooltip in AgendaEvent:", e);
        // Fallback simple view if Tooltip fails
        return (
            <div className="h-full w-full flex flex-col justify-between p-1 text-xs leading-tight overflow-hidden">
                <span className="font-bold truncate">{patientName}</span>
                <span className="text-[10px] opacity-80 mt-auto">{startTime} - {endTime}</span>
            </div>
        );
    }
};

export default AgendaEvent;
