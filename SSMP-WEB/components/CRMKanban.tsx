import React, { useState, useEffect } from 'react';
import { supabaseService } from '../src/services/supabaseService';
import { Lead } from '../types';

// Icons
const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

interface CRMKanbanProps {
    onSelectLead: (leadId: string) => void;
}

const COLUMNS = [
    { id: 'Frio', title: 'Frio', color: 'bg-blue-100 text-blue-800' },
    { id: 'Morno', title: 'Morno', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'Quente', title: 'Quente', color: 'bg-orange-100 text-orange-800' },
    { id: 'Ultra Quente', title: 'Ultra Quente', color: 'bg-red-100 text-red-800' },
];

const CRMKanban: React.FC<CRMKanbanProps> = ({ onSelectLead }) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggedLead, setDraggedLead] = useState<string | null>(null);

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
            // alert('Erro ao carregar leads');
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        setDraggedLead(leadId);
        e.dataTransfer.setData('leadId', leadId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, status: Lead['kanban_status']) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (!leadId) return;

        // Optimistic Update
        const originalLeads = [...leads];
        const updatedLeads = leads.map(l => l.id === leadId ? { ...l, kanban_status: status } : l);
        setLeads(updatedLeads);
        setDraggedLead(null);

        try {
            await supabaseService.updateLead(leadId, { kanban_status: status });
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Erro ao atualizar status. Revertendo...');
            setLeads(originalLeads);
        }
    };

    const renderCard = (lead: Lead) => {
        return (
            <div
                key={lead.id}
                draggable
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onClick={() => onSelectLead(lead.id)}
                className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:shadow-md transition-all mb-3 relative group
          ${draggedLead === lead.id ? 'opacity-50' : 'opacity-100'}
        `}
            >
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100">{lead.name}</h4>
                    {lead.ai_score !== undefined && (
                        <span className={`text-xs px-2 py-1 rounded-full font-bold
                    ${lead.ai_score > 80 ? 'bg-green-100 text-green-700' : lead.ai_score > 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}
                `}>
                            {lead.ai_score}
                        </span>
                    )}
                </div>

                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <Icon name="attach_money" className="text-[14px]" />
                    {lead.budget_range}
                </div>

                {lead.ai_tags && lead.ai_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {lead.ai_tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-[10px] bg-primary/5 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {lead.ai_urgency && (
                    <div className={`mt-2 text-xs font-semibold uppercase tracking-wider
                ${lead.ai_urgency === 'alta' ? 'text-red-500' : lead.ai_urgency === 'média' ? 'text-yellow-500' : 'text-green-500'}
             `}>
                        Urgência: {lead.ai_urgency}
                    </div>
                )}

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icon name="drag_indicator" className="text-gray-400" />
                </div>
            </div>
        );
    };

    if (loading) return <div className="flex justify-center p-10"><Icon name="progress_activity" className="animate-spin text-3xl text-primary" /></div>;

    return (
        <div className="h-full overflow-x-auto">
            <div className="flex gap-4 min-w-full h-full pb-4">
                {COLUMNS.map(col => (
                    <div
                        key={col.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id as any)}
                        className={`flex-1 min-w-[240px] rounded-xl p-4 flex flex-col h-full border border-gray-100 dark:border-gray-800 ${col.color.split(' ')[0]}/30 dark:bg-gray-900/50`}
                    >
                        <div className={`flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 ${col.color.split(' ')[1]}`}>
                            <h3 className="font-bold flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${col.color.split(' ')[0]}`}></span>
                                {col.title}
                            </h3>
                            <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-xs font-mono">
                                {leads.filter(l => l.kanban_status === col.id).length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            {leads
                                .filter(l => l.kanban_status === col.id || (!l.kanban_status && col.id === 'Frio'))
                                .map(renderCard)
                            }
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CRMKanban;
