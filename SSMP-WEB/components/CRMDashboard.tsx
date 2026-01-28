import React, { useState, useEffect } from 'react';
import { supabaseService } from '../src/services/supabaseService';
import { Lead } from '../types';

// Icons
const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

interface CRMDashboardProps {
    onSelectLead: (leadId: string) => void;
    onNewLead?: () => void;
}

const CRMDashboard: React.FC<CRMDashboardProps> = ({ onSelectLead, onNewLead }) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [waitTimeFilter, setWaitTimeFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadLeads();
    }, []);

    const loadLeads = async () => {
        try {
            setLoading(true);
            const data = await supabaseService.getLeads();
            setLeads(data);
        } catch (err) {
            console.error('Error loading leads:', err);
        } finally {
            setLoading(false);
        }
    };

    const getWaitTime = (createdAt: string) => {
        const created = new Date(createdAt);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (days > 0) return `${days} dia${days > 1 ? 's' : ''}`;

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`;

        const minutes = Math.floor(diffMs / (1000 * 60));
        return `${minutes} min`;
    };

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.kanban_status?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || (lead.kanban_status || 'Frio') === statusFilter;

        let matchesWaitTime = true;
        if (waitTimeFilter !== 'all') {
            const created = new Date(lead.created_at);
            const now = new Date();
            const diffMs = now.getTime() - created.getTime();
            const diffMinutes = Math.floor(diffMs / (1000 * 60));

            if (waitTimeFilter === '15m') matchesWaitTime = diffMinutes >= 15;
            if (waitTimeFilter === '30m') matchesWaitTime = diffMinutes >= 30;
            if (waitTimeFilter === '1h') matchesWaitTime = diffMinutes >= 60;
            if (waitTimeFilter === '2h') matchesWaitTime = diffMinutes >= 120;
            if (waitTimeFilter === '1d') matchesWaitTime = diffMinutes >= 1440; // 24 * 60
        }

        return matchesSearch && matchesStatus && matchesWaitTime;
    });

    if (loading) return <div className="flex justify-center p-10"><Icon name="progress_activity" className="animate-spin text-3xl text-primary" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 h-full overflow-y-auto pr-2">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-[#2d181e] p-6 rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Painel de Leads</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Visão geral e desempenho da captação.</p>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Status Filter */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">Todos Status</option>
                            <option value="Quente">Quente</option>
                            <option value="Morno">Morno</option>
                            <option value="Frio">Frio</option>
                            <option value="Perdido">Perdido</option>
                        </select>
                        <Icon name="expand_more" className="absolute right-3 top-2.5 text-gray-400 text-lg pointer-events-none" />
                    </div>

                    {/* Wait Time Filter */}
                    <div className="relative">
                        <select
                            value={waitTimeFilter}
                            onChange={(e) => setWaitTimeFilter(e.target.value)}
                            className="px-4 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">Qualquer espera</option>
                            <option value="15m">+15 minutos</option>
                            <option value="30m">+30 minutos</option>
                            <option value="1h">+1 hora</option>
                            <option value="2h">+2 horas</option>
                            <option value="1d">+1 dia</option>
                        </select>
                        <Icon name="expand_more" className="absolute right-3 top-2.5 text-gray-400 text-lg pointer-events-none" />
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar lead..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-primary focus:border-primary w-full md:w-64 outline-none"
                        />
                        <Icon name="search" className="absolute left-3 top-2.5 text-gray-400 text-lg" />
                    </div>
                </div>
            </div>

            {/* Leads Table */}
            <section className="bg-white dark:bg-[#2d181e] rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#fff5f7] dark:bg-[#351a21] text-[#9a4c5f] dark:text-[#c4a1a9] text-xs font-bold uppercase tracking-widest">
                                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Lead</th>
                                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Status</th>
                                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Data Entrada</th>
                                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a]">Tempo Espera</th>
                                <th className="px-6 py-4 border-b border-[#f3e7ea] dark:border-[#3d242a] text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-primary/10">
                            {filteredLeads.length > 0 ? (
                                filteredLeads.map((lead, index) => (
                                    <tr
                                        key={lead.id}
                                        className={`transition-colors cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0 ${index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-white/5'} hover:bg-gray-100 dark:hover:bg-primary/10`}
                                        onClick={() => onSelectLead(lead.id)}
                                    >
                                        <td className="px-6 py-3 border-r border-gray-100 dark:border-white/5 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                                    {lead.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{lead.name}</p>
                                                    <p className="text-xs text-gray-500 font-medium">{lead.whatsapp}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 border-r border-gray-100 dark:border-white/5 last:border-0">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide
                            ${lead.kanban_status === 'Frio' ? 'bg-blue-100 text-blue-700' :
                                                    lead.kanban_status === 'Morno' ? 'bg-yellow-100 text-yellow-700' :
                                                        lead.kanban_status === 'Quente' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-red-100 text-red-700'}
                        `}>
                                                {lead.kanban_status || 'Frio'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 border-r border-gray-100 dark:border-white/5 last:border-0 text-gray-700 dark:text-gray-300 text-sm">
                                            {new Date(lead.created_at).toLocaleDateString()} <span className="text-xs text-gray-400">{new Date(lead.created_at).toLocaleTimeString().slice(0, 5)}</span>
                                        </td>
                                        <td className="px-6 py-3 border-r border-gray-100 dark:border-white/5 last:border-0">
                                            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-gray-600 dark:text-gray-400">
                                                <Icon name="timer" className="text-[16px]" />
                                                {getWaitTime(lead.created_at)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                className="text-gray-400 hover:text-primary transition-colors"
                                                aria-label="Ver detalhes"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectLead(lead.id);
                                                }}
                                            >
                                                <Icon name="visibility" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        Nenhum lead encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default CRMDashboard;
