import React, { useState, useEffect } from 'react';
import AppointmentModal from '../AppointmentModal';
import ScheduleBlockModal from '../../src/components/agenda/ScheduleBlockModal';

interface UnifiedAgendaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patients: any[];
    procedures: any[];
    professionals: any[];
    initialDate?: Date;
    initialEvent?: any;
    clinicId?: string | null;
    defaultTab?: 'appointment' | 'block';
    editingBlock?: any;
    isReadOnly?: boolean;
}

const UnifiedAgendaModal: React.FC<UnifiedAgendaModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    patients,
    procedures,
    professionals,
    initialDate,
    initialEvent,
    clinicId,
    defaultTab = 'appointment',
    editingBlock,
    isReadOnly
}) => {
    const [activeTab, setActiveTab] = useState<'appointment' | 'block'>(defaultTab);

    // Sync active tab with defaultTab when modal opens
    useEffect(() => {
        if (isOpen) {
            // If we have an editing block, force 'block' tab
            if (editingBlock) {
                setActiveTab('block');
            } else if (initialEvent) {
                // If editing an event, force 'appointment'
                setActiveTab('appointment');
            } else {
                setActiveTab(defaultTab);
            }
        }
    }, [isOpen, defaultTab, editingBlock, initialEvent]);

    if (!isOpen) return null;

    // Determine if we should show tabs (hide when editing to avoid confusion)
    const showTabs = !initialEvent && !editingBlock;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${activeTab === 'appointment' ? 'max-w-lg' : 'max-w-2xl'} overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]`}>
                
                {/* Header with Tabs */}
                <div className="flex flex-col border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                    <div className="flex justify-between items-center p-6 pb-2">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            {initialEvent ? (isReadOnly ? 'Visualizar Agendamento' : 'Editar Agendamento') : (editingBlock ? 'Editar Bloqueio' : (activeTab === 'appointment' ? 'Novo Agendamento' : 'Bloqueio de Horário'))}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {showTabs && (
                        <div className="flex px-6 gap-6">
                            <button
                                onClick={() => setActiveTab('appointment')}
                                className={`pb-3 text-sm font-semibold transition-all border-b-2 ${
                                    activeTab === 'appointment' 
                                    ? 'border-primary text-primary' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">calendar_today</span>
                                    Agendamento
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('block')}
                                className={`pb-3 text-sm font-semibold transition-all border-b-2 ${
                                    activeTab === 'block' 
                                    ? 'border-red-500 text-red-500' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">block</span>
                                    Bloqueio
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="overflow-hidden flex-grow flex flex-col">
                    {activeTab === 'appointment' ? (
                        <div className="overflow-y-auto flex-grow h-full">
                            {/* We use a modified AppointmentModal here that doesn't have its own backdrop */}
                            {/* For now, I'll inject the content directly or modify the original to handle 'embedded' mode */}
                            <AppointmentModal
                                isOpen={true}
                                onClose={onClose}
                                onSuccess={onSuccess}
                                patients={patients}
                                procedures={procedures}
                                professionals={professionals}
                                initialDate={initialDate}
                                initialEvent={initialEvent}
                                clinicId={clinicId}
                                isEmbedded={true}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    ) : (
                        <div className="overflow-y-auto flex-grow h-full">
                             <ScheduleBlockModal
                                isOpen={true}
                                onClose={onClose}
                                onSuccess={onSuccess}
                                clinicId={clinicId || ''}
                                professionals={professionals.map(p => ({ id: p.id, name: p.full_name || p.name }))}
                                initialDate={initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                                editingBlock={editingBlock}
                                isEmbedded={true}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UnifiedAgendaModal;
