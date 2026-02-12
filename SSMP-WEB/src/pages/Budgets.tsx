import React, { useState } from 'react';
import { BudgetsList } from '../components/Budgets/BudgetsList';
import { BudgetForm } from '../components/Budgets/BudgetForm';
import { BudgetPrint } from '../components/Budgets/BudgetPrint';
import { Budget } from '../../types';
import { supabaseService } from '../services/supabaseService';
import { Toaster } from 'react-hot-toast';

export const BudgetsPage: React.FC = () => {
    const [view, setView] = useState<'list' | 'form' | 'print'>('list');
    const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
    const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);

    const handleNewBudget = () => {
        setEditingBudget(undefined);
        setView('form');
    };

    const handleEditBudget = async (id: string) => {
        try {
            const budgetData = await supabaseService.getBudgetById(id);
            setEditingBudget(budgetData);
            setView('form');
        } catch (error) {
            console.error('Error loading budget for edit:', error);
        }
    };

    const handleViewBudget = (id: string) => {
        setSelectedBudgetId(id);
        setView('print');
    };

    const handleSave = () => {
        setView('list');
    };

    const handleCancel = () => {
        setView('list');
    };

    const handleClosePrint = () => {
        setView('list');
    };

    return (
        <div className="h-full">
            <Toaster position="top-right" />

            {view === 'list' && (
                <BudgetsList
                    onNewBudget={handleNewBudget}
                    onEditBudget={handleEditBudget}
                    onViewBudget={handleViewBudget}
                />
            )}

            {view === 'form' && (
                <BudgetForm
                    initialData={editingBudget}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            )}

            {view === 'print' && selectedBudgetId && (
                <BudgetPrint
                    budgetId={selectedBudgetId}
                    onClose={handleClosePrint}
                />
            )}
        </div>
    );
};
