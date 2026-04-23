import React, { useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Consultation } from '../../../types';
import { PasswordModal } from './PasswordModal';

interface CopilotHistorySidebarProps {
    consultations: Consultation[];
    selectedId: string | null;
    patientName?: string;
    onSelect: (id: string) => void;
    onNewConsultation: () => void;
    loading: boolean;
}

export const CopilotHistorySidebar: React.FC<CopilotHistorySidebarProps> = ({
    consultations,
    selectedId,
    patientName,
    onSelect,
    onNewConsultation,
    loading
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);

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

    const handleSelectClick = (id: string) => {
        if (id === selectedId) return;
        setPendingSelectId(id);
        setIsPasswordModalOpen(true);
    };

    const handlePasswordSuccess = () => {
        if (pendingSelectId) {
            onSelect(pendingSelectId);
            setPendingSelectId(null);
        }
        setIsPasswordModalOpen(false);
    };

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
        <>
            <div className="w-64 bg-gray-50/20 dark:bg-black/20 flex flex-col h-full shrink-0 relative z-20">
                {/* Main Wrapper with subtle border for definition */}
                <div className="flex flex-col h-full m-2 bg-white dark:bg-gray-900 rounded-[20px] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">

                    {/* Header Section */}
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-rose-500 flex items-center justify-center text-white rotate-3 transition-transform">
                                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                                </div>
                                <span className="font-black text-lg tracking-tighter text-gray-900 dark:text-white uppercase italic">Ana</span>
                            </div>
                            <button
                                onClick={() => setIsCollapsed(true)}
                                className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px]">side_navigation</span>
                            </button>
                        </div>

                        <button
                            onClick={onNewConsultation}
                            className="group w-full flex items-center justify-between px-4 py-3 bg-rose-500 text-white rounded-xl font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-rose-500/20"
                        >
                            <span className="uppercase tracking-[0.1em] text-[10px]">Nova Consulta</span>
                            <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">east</span>
                        </button>

                        <div className="mt-4 space-y-1">
                            <button className="w-full flex items-center gap-2.5 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rose-500 transition-colors">
                                <span className="material-symbols-outlined text-[16px]">history</span>
                                Consultas
                            </button>
                            <button className="w-full flex items-center gap-2.5 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rose-500 transition-colors">
                                <span className="material-symbols-outlined text-[16px]">category</span>
                                Modelos
                            </button>
                        </div>
                    </div>

                    {/* List Body with Custom Scrollbar */}
                    <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <div className="h-8 w-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest animate-pulse">Sincroniza</span>
                            </div>
                        ) : (
                            Object.entries(grouped).map(([label, items]) => (
                                <div key={label} className="mt-4 first:mt-1">
                                    <h3 className="text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.2em] mb-2 px-1 flex items-center gap-1.5">
                                        <span className="w-2 h-px bg-gray-200 dark:bg-gray-800"></span>
                                        {label}
                                    </h3>
                                    <div className="space-y-1">
                                        {items.map(consultation => (
                                            <button
                                                key={consultation.id}
                                                onClick={() => handleSelectClick(consultation.id)}
                                                className={`w-full text-left p-3 rounded-xl transition-all border relative overflow-hidden group ${selectedId === consultation.id
                                                    ? 'bg-rose-50/30 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20 shadow-sm'
                                                    : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-100 dark:hover:border-gray-800'
                                                    }`}
                                            >
                                                {selectedId === consultation.id && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                                                )}

                                                <div className="flex flex-col gap-1">
                                                    <p className={`text-[12px] font-black leading-tight line-clamp-1 transition-colors ${selectedId === consultation.id
                                                        ? 'text-rose-600 dark:text-rose-400'
                                                        : 'text-gray-900 dark:text-gray-100 group-hover:text-rose-500'
                                                        }`}>
                                                        {patientName || "Paciente"}
                                                    </p>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[10px] font-medium ${selectedId === consultation.id ? 'text-rose-500/70' : 'text-gray-400'}`}>
                                                                {format(new Date(consultation.createdAt), 'dd/MM HH:mm')}
                                                            </span>
                                                        </div>
                                                        {consultation.metadata?.duration && (
                                                            <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 bg-gray-100/50 dark:bg-white/5 px-1.5 py-0.5 rounded-md">
                                                                <span className="material-symbols-outlined text-[12px]">timer</span>
                                                                {Math.floor(consultation.metadata.duration / 60)}m {Math.floor(consultation.metadata.duration % 60)}s
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <div className="flex items-center gap-1 opacity-40">
                                                            <span className="material-symbols-outlined text-[12px]">lock</span>
                                                            <span className="text-[8px] uppercase font-black tracking-widest italic">Conteúdo Protegido</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Aesthetic Footer */}
                    <div className="p-3 bg-gray-50/50 dark:bg-black/20 mt-auto border-t border-gray-100 dark:border-white/5">
                        <button className="w-full flex items-center justify-between px-2 py-1 text-[9px] font-black text-gray-400 hover:text-rose-500 transition-colors uppercase tracking-widest">
                            <span>Ana v2.0</span>
                            <span className="material-symbols-outlined text-[16px]">verified_user</span>
                        </button>
                    </div>
                </div>
            </div>

            <PasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => {
                    setIsPasswordModalOpen(false);
                    setPendingSelectId(null);
                }}
                onSuccess={handlePasswordSuccess}
            />
        </>
    );
};
