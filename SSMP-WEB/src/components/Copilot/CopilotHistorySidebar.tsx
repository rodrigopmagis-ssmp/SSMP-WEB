import React, { useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Consultation } from '../../../types';

interface CopilotHistorySidebarProps {
    consultations: Consultation[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onNewConsultation: () => void;
    loading: boolean;
}

export const CopilotHistorySidebar: React.FC<CopilotHistorySidebarProps> = ({
    consultations,
    selectedId,
    onSelect,
    onNewConsultation,
    loading
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const groupConsultations = (items: Consultation[]) => {
        const groups: { [key: string]: Consultation[] } = {};
        items.forEach(c => {
            const date = new Date(c.createdAt);
            let key = format(date, 'dd/MM/yyyy');
            if (isToday(date)) key = 'HOJE';
            else if (isYesterday(date)) key = 'ONTEM';
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        });
        return groups;
    };

    const grouped = groupConsultations(consultations);

    if (isCollapsed) {
        return (
            <div className="w-16 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col items-center py-4 h-full shrink-0">
                {/* Expand Button */}
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="mb-6 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Expandir menu"
                >
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">menu</span>
                </button>

                {/* New Consultation */}
                <button
                    onClick={onNewConsultation}
                    className="mb-4 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                    title="Nova consulta"
                >
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">add</span>
                </button>

                {/* Icons */}
                <button className="mb-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Consultas anteriores">
                    <span className="material-symbols-outlined text-gray-500 text-[20px]">history</span>
                </button>
                <button className="mb-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Modelos de documento">
                    <span className="material-symbols-outlined text-gray-500 text-[20px]">description</span>
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Help */}
                <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Ajuda e suporte">
                    <span className="material-symbols-outlined text-gray-500 text-[20px]">help</span>
                </button>
            </div>
        );
    }

    return (
        <div className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined" style={{ color: '#833AB4' }}>psychology</span>
                        <span className="font-bold text-lg text-gray-800 dark:text-white">voa</span>
                    </div>
                    {/* Collapse Button */}
                    <button
                        onClick={() => setIsCollapsed(true)}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                        title="Recolher menu"
                    >
                        <span className="material-symbols-outlined text-gray-500 text-[18px]">chevron_left</span>
                    </button>
                </div>

                <button
                    onClick={onNewConsultation}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg font-medium transition-colors mb-3"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Nova consulta
                </button>

                <div className="space-y-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px]">history</span>
                        Consultas anteriores
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px]">description</span>
                        Modelos de documento
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3">
                {loading ? (
                    <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#833AB4' }}></div>
                    </div>
                ) : (
                    Object.entries(grouped).map(([label, items]) => (
                        <div key={label} className="mb-5">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                {label}
                            </h3>
                            <div className="space-y-1">
                                {items.map(consultation => (
                                    <button
                                        key={consultation.id}
                                        onClick={() => onSelect(consultation.id)}
                                        className={`w-full text-left p-3 rounded-lg transition-all ${selectedId === consultation.id
                                                ? 'ring-1 ring-primary/30 bg-primary/5'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-medium ${selectedId === consultation.id ? 'text-primary' : 'text-gray-500'
                                                }`}>
                                                {format(new Date(consultation.createdAt), 'HH:mm')}
                                            </span>
                                            {consultation.metadata?.duration && (
                                                <span className="text-[10px] text-gray-400">
                                                    {Math.floor(consultation.metadata.duration / 60)}m {consultation.metadata.duration % 60}s
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-sm font-medium line-clamp-2 ${selectedId === consultation.id
                                                ? 'text-gray-900 dark:text-white'
                                                : 'text-gray-600 dark:text-gray-300'
                                            }`}>
                                            {consultation.aiResumo || consultation.cleanTranscript || "Processando consulta..."}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-800">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[18px]">help</span>
                    Ajuda e suporte
                </button>
            </div>
        </div>
    );
};
