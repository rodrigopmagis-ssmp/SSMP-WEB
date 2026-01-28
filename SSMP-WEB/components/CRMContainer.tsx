import React, { useState } from 'react';
import CRMKanban from './CRMKanban';
import CRMDashboard from './CRMDashboard';
import CRMQuizSettings from './CRMQuizSettings';
import CRMCalibration from './CRMCalibration'; // New Import
import LeadDetails from './LeadDetails';
import { Lead } from '../types';

// Icons
const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

interface CRMContainerProps {
    onNavigateToLead: (leadId: string) => void;
    currentViewOverride?: 'dashboard' | 'kanban' | 'details'; // Optional override for deep linking logic
}

const CRMContainer: React.FC<CRMContainerProps> = ({ onNavigateToLead }) => {
    const [view, setView] = useState<'kanban' | 'dashboard' | 'settings' | 'calibration'>('kanban');

    return (
        <div className="flex h-full bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
            {/* CRM Sidebar */}
            <aside className="w-16 md:w-64 bg-white dark:bg-[#2d181e] border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 hidden md:block">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">CRM / Visualização</h2>
                </div>

                <nav className="flex-1 p-2 space-y-1">
                    <button
                        onClick={() => setView('kanban')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-medium text-sm
                            ${view === 'kanban'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            }
                        `}
                        title="Kanban"
                    >
                        <Icon name="view_kanban" className="" />
                        <span className="hidden md:block">Kanban</span>
                    </button>

                    <button
                        onClick={() => setView('dashboard')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-medium text-sm
                            ${view === 'dashboard'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            }
                        `}
                        title="Painel de Controle"
                    >
                        <Icon name="currency_exchange" className="" />
                        <span className="hidden md:block">Painel de Leads</span>
                    </button>

                    <button
                        onClick={() => setView('settings')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-medium text-sm
                            ${view === 'settings'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            }
                        `}
                        title="Configuração do Quiz"
                    >
                        <Icon name="settings_heart" className="" />
                        <span className="hidden md:block">Configurar Quiz</span>
                    </button>

                    <button
                        onClick={() => setView('calibration')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-medium text-sm
                            ${view === 'calibration'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                            }
                        `}
                        title="Calibrar Leads"
                    >
                        <Icon name="straighten" className="" />
                        <span className="hidden md:block">Calibrar Leads</span>
                    </button>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-4 md:p-6 overflow-hidden h-full">
                {view === 'kanban' && <CRMKanban onSelectLead={onNavigateToLead} />}
                {view === 'dashboard' && <CRMDashboard onSelectLead={onNavigateToLead} />}
                {view === 'settings' && <CRMQuizSettings />}
                {view === 'calibration' && <CRMCalibration />}
            </main>
        </div>
    );
};

export default CRMContainer;
