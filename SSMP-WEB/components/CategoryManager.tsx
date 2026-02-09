import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { ProcedureCategory } from '../types';
import { supabaseService } from '../src/services/supabaseService';
import Button from './ui/Button';

interface CategoryManagerProps {
    isOpen: boolean;
    onClose: () => void;
    categories: ProcedureCategory[];
    onUpdateCategories: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
    isOpen,
    onClose,
    categories,
    onUpdateCategories
}) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        setLoading(true);
        setError(null);
        try {
            await supabaseService.createProcedureCategory(newCategoryName);
            setNewCategoryName('');
            onUpdateCategories();
        } catch (err: any) {
            setError(err.message || 'Erro ao criar categoria.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
        setLoading(true);
        setError(null);
        try {
            await supabaseService.deleteProcedureCategory(id);
            onUpdateCategories();
        } catch (err: any) {
            setError(err.message || 'Erro ao excluir categoria.');
        } finally {
            setLoading(false);
        }
    };

    return typeof document !== 'undefined' ? ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#2d181e] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-[#f3e7ea] dark:border-[#3a2228] flex justify-between items-center">
                    <h2 className="text-lg font-bold text-[#1b0d11] dark:text-white">Gerenciar Categorias</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                    {/* Add New */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Nova Categoria..."
                            className="flex-1 px-3 py-2 border border-[#e7cfd5] dark:border-[#4d3239] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-[#3d242a] text-[#1b0d11] dark:text-white"
                        />
                        <Button onClick={handleAddCategory} disabled={loading || !newCategoryName.trim()} variant="primary" size="sm">
                            <span className="material-symbols-outlined">add</span>
                        </Button>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    {/* List */}
                    <div className="flex flex-col gap-2">
                        {categories.length === 0 ? (
                            <p className="text-center text-gray-500 text-sm py-4">Nenhuma categoria cadastrada.</p>
                        ) : (
                            categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-[#fcf8f9] dark:bg-white/5 rounded-lg">
                                    <span className="text-[#1b0d11] dark:text-gray-200">{cat.name}</span>
                                    <button
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        disabled={loading}
                                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-[#f3e7ea] dark:border-[#3a2228] bg-[#fcf8f9] dark:bg-[#251016]">
                    <Button onClick={onClose} variant="secondary" className="w-full">
                        Fechar
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    ) : null;
};

export default CategoryManager;
