import React, { useState, useEffect } from 'react';
import { supabaseService } from '../../services/supabaseService';
import { Budget } from '../../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface BudgetsListProps {
    onNewBudget: () => void;
    onEditBudget: (id: string) => void;
    onViewBudget: (id: string) => void; // For PDF/Print view
}

export const BudgetsList: React.FC<BudgetsListProps> = ({ onNewBudget, onEditBudget, onViewBudget }) => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBudgets();
    }, []);

    const loadBudgets = async () => {
        try {
            const data = await supabaseService.getBudgets();
            setBudgets(data);
        } catch (error) {
            console.error('Error loading budgets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, patientName: string) => {
        if (!confirm(`Tem certeza que deseja excluir o orçamento de "${patientName}"? Esta ação não pode ser desfeita.`)) return;
        try {
            await supabaseService.deleteBudget(id);
            toast.success('Orçamento excluído com sucesso!');
            loadBudgets();
        } catch (error) {
            console.error('Error deleting budget:', error);
            toast.error('Erro ao excluir orçamento.');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'sent': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved': return 'Aprovado';
            case 'sent': return 'Enviado';
            case 'cancelled': return 'Cancelado';
            case 'draft': return 'Rascunho';
            default: return status;
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando orçamentos...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Orçamentos</h2>
                    <p className="text-sm text-gray-500 mt-1">Gerencie as propostas comerciais da clínica</p>
                </div>
                <button
                    onClick={onNewBudget}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">add</span>
                    Novo Orçamento
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Paciente</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Validade</th>
                            <th className="px-6 py-4">Valor Total</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {budgets.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    Nenhum orçamento encontrado. Clique em "Novo Orçamento" para começar.
                                </td>
                            </tr>
                        ) : (
                            budgets.map((budget) => (
                                <tr key={budget.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                {budget.patient?.avatar ? (
                                                    <img src={budget.patient.avatar} alt={budget.patient.name} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    budget.patient?.name?.charAt(0) || '?'
                                                )}
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {budget.patient?.name || 'Paciente não identificado'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {format(new Date(budget.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {budget.valid_until ? format(new Date(budget.valid_until), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.total_with_fee)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(budget.status)}`}>
                                            {getStatusLabel(budget.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => onViewBudget(budget.id)}
                                                className="p-2 text-gray-400 hover:text-primary transition-colors"
                                                title="Visualizar/Imprimir"
                                            >
                                                <span className="material-symbols-outlined">print</span>
                                            </button>
                                            <button
                                                onClick={() => onEditBudget(budget.id)}
                                                className="p-2 text-gray-400 hover:text-primary transition-colors"
                                                title="Editar"
                                            >
                                                <span className="material-symbols-outlined">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(budget.id, budget.patient?.name || 'desconhecido')}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Excluir"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
