import { useState, useEffect } from 'react';
import { TaskCategory } from '../../types';
import { taskCategoryService } from '../../src/services/taskCategoryService';
import toast from 'react-hot-toast';

interface CategoryManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    clinicId: string;
    userId: string;
    onCategoryCreated?: () => void;
}

// Popular Material Symbols icons for categories
const ICON_OPTIONS = [
    'person_check', 'payments', 'business_center', 'local_hospital', 'corporate_fare',
    'task_alt', 'event', 'description', 'folder', 'label',
    'notifications', 'schedule', 'assignment', 'work', 'home',
    'shopping_cart', 'phone', 'email', 'settings', 'star'
];

// Color palette
const COLOR_OPTIONS = [
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Laranja', value: '#F59E0B' },
    { name: 'Roxo', value: '#8B5CF6' },
    { name: 'Vermelho', value: '#EF4444' },
    { name: 'Amarelo', value: '#F59E0B' },
    { name: 'Ciano', value: '#06B6D4' },
    { name: 'Índigo', value: '#6366F1' },
    { name: 'Cinza', value: '#6B7280' }
];

export default function CategoryManagementModal({
    isOpen,
    onClose,
    clinicId,
    userId,
    onCategoryCreated
}: CategoryManagementModalProps) {
    const [categories, setCategories] = useState<TaskCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: COLOR_OPTIONS[0].value,
        icon: ICON_OPTIONS[0]
    });

    useEffect(() => {
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen, clinicId]);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const data = await taskCategoryService.getCategories(clinicId);
            setCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
            toast.error('Erro ao carregar categorias');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Nome da categoria é obrigatório');
            return;
        }

        try {
            setLoading(true);

            if (editingCategory) {
                // Update existing category
                await taskCategoryService.updateCategory(editingCategory.id, {
                    name: formData.name,
                    description: formData.description,
                    color: formData.color,
                    icon: formData.icon
                });
                toast.success('Categoria atualizada com sucesso!');
            } else {
                // Create new category
                await taskCategoryService.createCategory({
                    name: formData.name,
                    description: formData.description,
                    color: formData.color,
                    icon: formData.icon,
                    clinicId
                }, userId);
                toast.success('Categoria criada com sucesso!');
            }

            // Reset form
            setFormData({
                name: '',
                description: '',
                color: COLOR_OPTIONS[0].value,
                icon: ICON_OPTIONS[0]
            });
            setEditingCategory(null);
            setShowForm(false);
            loadCategories();
            onCategoryCreated?.();
        } catch (error: any) {
            console.error('Error saving category:', error);
            toast.error(error.message || 'Erro ao salvar categoria');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (category: TaskCategory) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description || '',
            color: category.color,
            icon: category.icon
        });
        setShowForm(true);
    };

    const handleToggleActive = async (category: TaskCategory) => {
        if (category.isDefault) {
            toast.error('Categorias padrão não podem ser inativadas');
            return;
        }

        try {
            if (category.isActive) {
                await taskCategoryService.inactivateCategory(category.id);
                toast.success('Categoria inativada');
            } else {
                await taskCategoryService.updateCategory(category.id, { isActive: true });
                toast.success('Categoria reativada');
            }
            loadCategories();
        } catch (error) {
            console.error('Error toggling category:', error);
            toast.error('Erro ao alterar status da categoria');
        }
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingCategory(null);
        setFormData({
            name: '',
            description: '',
            color: COLOR_OPTIONS[0].value,
            icon: ICON_OPTIONS[0]
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-3xl text-primary">category</span>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Gerenciar Categorias
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Crie e organize categorias de tarefas
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <span className="material-symbols-outlined text-gray-500">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* New Category Button */}
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full mb-6 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            <span className="material-symbols-outlined">add</span>
                            Nova Categoria
                        </button>
                    )}

                    {/* Form */}
                    {showForm && (
                        <form onSubmit={handleSubmit} className="mb-6 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-primary/20">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                            </h3>

                            <div className="space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nome *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Ex: Marketing"
                                        required
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Descrição
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                        rows={2}
                                        placeholder="Breve descrição da categoria"
                                    />
                                </div>

                                {/* Color Picker */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Cor
                                    </label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {COLOR_OPTIONS.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color: color.value })}
                                                className={`p-3 rounded-lg border-2 transition-all ${formData.color === color.value
                                                        ? 'border-gray-900 dark:border-white scale-110'
                                                        : 'border-transparent hover:scale-105'
                                                    }`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            >
                                                {formData.color === color.value && (
                                                    <span className="material-symbols-outlined text-white text-sm">check</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Icon Picker */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Ícone
                                    </label>
                                    <div className="grid grid-cols-10 gap-2">
                                        {ICON_OPTIONS.map((icon) => (
                                            <button
                                                key={icon}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, icon })}
                                                className={`p-2 rounded-lg border-2 transition-all ${formData.icon === icon
                                                        ? 'border-primary bg-primary/10'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-xl" style={{ color: formData.color }}>
                                                    {icon}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-2xl" style={{ color: formData.color }}>
                                            {formData.icon}
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {formData.name || 'Nome da Categoria'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                                >
                                    {loading ? 'Salvando...' : editingCategory ? 'Atualizar' : 'Criar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelForm}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Categories List */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Categorias Disponíveis
                        </h3>

                        {loading && categories.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">Carregando...</div>
                        ) : categories.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">Nenhuma categoria encontrada</div>
                        ) : (
                            categories.map((category) => (
                                <div
                                    key={category.id}
                                    className={`p-4 rounded-lg border-2 transition-all ${category.isActive
                                            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                            : 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <span className="material-symbols-outlined text-3xl" style={{ color: category.color }}>
                                                {category.icon}
                                            </span>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white">
                                                        {category.name}
                                                    </h4>
                                                    {category.isDefault && (
                                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                                                            Padrão
                                                        </span>
                                                    )}
                                                    {!category.isActive && (
                                                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded">
                                                            Inativa
                                                        </span>
                                                    )}
                                                </div>
                                                {category.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                        {category.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions (only for non-default categories) */}
                                        {!category.isDefault && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(category)}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(category)}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                    title={category.isActive ? 'Inativar' : 'Reativar'}
                                                >
                                                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">
                                                        {category.isActive ? 'toggle_on' : 'toggle_off'}
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
