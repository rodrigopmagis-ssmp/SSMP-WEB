import React, { useState, useEffect } from 'react';
import { supabaseService } from '../src/services/supabaseService';

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface TagManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

const COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#84CC16', // Lime
    '#22C55E', // Green
    '#10B981', // Emerald
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#0EA5E9', // Sky
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#A855F7', // Purple
    '#D946EF', // Fuchsia
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#64748B', // Slate
];

const TagManager: React.FC<TagManagerProps> = ({ isOpen, onClose }) => {
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(COLORS[0]);
    const [createError, setCreateError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchTags();
        }
    }, [isOpen]);

    const fetchTags = async () => {
        setLoading(true);
        try {
            const data = await supabaseService.getTags();
            setTags(data || []);
        } catch (error) {
            console.error('Error fetching tags:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTagName.trim()) return;
        setCreateError('');

        try {
            await supabaseService.createTag(newTagName, newTagColor);
            setNewTagName('');
            setNewTagColor(COLORS[0]);
            fetchTags();
        } catch (error: any) {
            if (error.code === '23505') {
                setCreateError('Já existe uma etiqueta com esse nome.');
            } else {
                setCreateError('Erro ao criar etiqueta.');
            }
            console.error('Error creating tag:', error);
        }
    };

    const handleDeleteTag = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta etiqueta? Ela será removida de todos os pacientes.')) return;

        try {
            await supabaseService.deleteTag(id);
            fetchTags();
        } catch (error) {
            console.error('Error deleting tag:', error);
            alert('Erro ao excluir etiqueta.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">label</span>
                        Gerenciar Etiquetas
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleCreateTag} className="mb-8 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Nova Etiqueta</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="Ex: Cliente VIP"
                                    maxLength={30}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-2">Cor</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setNewTagColor(color)}
                                            className={`w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none ring-2 ring-offset-2 dark:ring-offset-gray-800 ${newTagColor === color ? 'ring-gray-400 scale-110' : 'ring-transparent'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {createError && (
                                <p className="text-xs text-red-500 font-medium">{createError}</p>
                            )}

                            <button
                                type="submit"
                                disabled={!newTagName.trim()}
                                className="w-full py-2 bg-black dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-base">add</span>
                                Criar Etiqueta
                            </button>
                        </div>
                    </form>

                    <div>
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center justify-between">
                            Etiquetas Existentes
                            <span className="text-xs font-normal text-gray-400">{tags.length} encontradas</span>
                        </h3>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <span className="material-symbols-outlined animate-spin text-gray-400">progress_activity</span>
                            </div>
                        ) : tags.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                Nenhuma etiqueta criada ainda.
                            </div>
                        ) : (
                            <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {tags.map(tag => (
                                    <div key={tag.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg group hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }}></div>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{tag.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteTag(tag.id)}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                            title="Excluir"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default TagManager;
