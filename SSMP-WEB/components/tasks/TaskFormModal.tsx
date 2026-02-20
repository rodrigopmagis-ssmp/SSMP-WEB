import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { taskService } from '../../src/services/tasksService';
import { taskCategoryService } from '../../src/services/taskCategoryService';
import { Task, TaskPriority, TaskStatusEnum, TaskType, TaskVisibility, TaskCategory } from '../../types';
import toast from 'react-hot-toast';

interface TaskFormModalProps {
    onClose: () => void;
    onSuccess: () => void;
    clinicId?: string | null;
    preloadedUsers?: User[];
    taskToEdit?: Task | null;
}

interface User {
    id: string;
    name: string;
    avatar_url?: string | null;
    email: string;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({ onClose, onSuccess, clinicId: propClinicId, preloadedUsers = [], taskToEdit }) => {
    const [users, setUsers] = useState<User[]>(preloadedUsers);
    const [loadingUsers, setLoadingUsers] = useState(preloadedUsers.length === 0);
    const [categories, setCategories] = useState<TaskCategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Get Current User ID on mount
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);
        };
        getUser();
    }, []);

    // Initial values logic
    const defaultValues = {
        title: taskToEdit?.title || '',
        description: taskToEdit?.description || '',
        type: taskToEdit?.type || TaskType.ONE_TIME,
        priority: taskToEdit?.priority || TaskPriority.MEDIUM,
        categoryId: taskToEdit?.categoryId || '',
        due_date: taskToEdit?.dueAt ? new Date(taskToEdit.dueAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        due_time: taskToEdit?.dueAt ? new Date(taskToEdit.dueAt).toTimeString().substring(0, 5) : '12:00',
        assigneeIds: taskToEdit?.assigneeIds || [] as string[],
        reminder: taskToEdit?.reminderMinutes?.toString() || '30',
        recurrence: taskToEdit?.recurrenceRule?.frequency || 'none',
        recurrenceEndType: 'never', // 'never', 'date', 'count'
        recurrenceEndDate: '',
        recurrenceCount: '',
        visibility: taskToEdit?.visibility || TaskVisibility.PRIVATE
    };

    const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm({
        defaultValues
    });

    // Reset form when taskToEdit changes (open modal with different task)
    useEffect(() => {
        if (taskToEdit) {
            reset({
                title: taskToEdit.title,
                description: taskToEdit.description || '',
                type: taskToEdit.type,
                priority: taskToEdit.priority,
                categoryId: taskToEdit.categoryId || '',
                due_date: new Date(taskToEdit.dueAt!).toISOString().split('T')[0],
                due_time: new Date(taskToEdit.dueAt!).toTimeString().substring(0, 5),
                assigneeIds: taskToEdit.assigneeIds || [],
                reminder: taskToEdit.reminderMinutes?.toString() || '30',
                recurrence: taskToEdit.recurrenceRule?.frequency || 'none',
                recurrenceEndType: taskToEdit.recurrenceRule?.endDate ? 'date' : 'never',
                recurrenceEndDate: taskToEdit.recurrenceRule?.endDate ? new Date(taskToEdit.recurrenceRule.endDate).toISOString().split('T')[0] : '',
                recurrenceCount: '',
                visibility: taskToEdit.visibility || TaskVisibility.PRIVATE
            });
        }
    }, [taskToEdit, reset]);

    const selectedAssignees = watch('assigneeIds');
    const taskType = watch('type');
    const visibility = watch('visibility');
    const recurrenceEndType = watch('recurrenceEndType');
    const recurrenceCount = watch('recurrenceCount');
    const recurrenceEndDate = watch('recurrenceEndDate');
    const recurrenceFreq = watch('recurrence');
    const dueDate = watch('due_date');

    // Effect to handle visibility changes logic
    // Effect to handle visibility changes logic
    useEffect(() => {
        if (visibility === TaskVisibility.PRIVATE) {
            // Se privada, atribui automaticamente ao criador (currentUserId)
            if (currentUserId) {
                setValue('assigneeIds', [currentUserId]);
            }
        } else if (visibility === TaskVisibility.PUBLIC) {
            // Se pública, atribui automaticamente a TODOS os usuários listados
            // e vamos esconder a seleção na UI para não permitir desmarcar
            if (users.length > 0) {
                const allUserIds = users.map(u => u.id);
                setValue('assigneeIds', allUserIds);
            }
        }
    }, [visibility, currentUserId, users, setValue]);

    useEffect(() => {
        if (preloadedUsers.length > 0) {
            setUsers(preloadedUsers);
            setLoadingUsers(false);
        } else {
            fetchUsers();
        }
    }, [preloadedUsers]);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .order('full_name');

            if (error) throw error;

            const mappedUsers = data?.map(u => ({
                id: u.id,
                name: u.full_name || u.email,
                avatar_url: null,
                email: u.email
            })) || [];

            setUsers(mappedUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUsers([{
                    id: user.id,
                    name: user.email || 'Eu',
                    email: user.email || '',
                }]);
                toast.error('Erro ao carregar equipe. Atribuindo apenas a você.');
            } else {
                toast.error('Erro ao carregar lista de usuários');
            }
        } finally {
            setLoadingUsers(false);
        }
    };

    // Load categories
    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user && !propClinicId) return;

            const clinicId = propClinicId || user?.user_metadata?.clinic_id;
            const data = await taskCategoryService.getCategories(clinicId);
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Erro ao carregar categorias');
        } finally {
            setLoadingCategories(false);
        }
    };

    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            // Combine date and time
            const dueAt = new Date(`${data.due_date}T${data.due_time}:00`).toISOString();

            // Prepare Recurrence Rule
            let recurrenceRule = undefined;
            if (data.type === TaskType.RECURRING && data.recurrence !== 'none') {
                let endDate = undefined;

                if (data.recurrenceEndType === 'date' && data.recurrenceEndDate) {
                    endDate = new Date(data.recurrenceEndDate).toISOString();
                } else if (data.recurrenceEndType === 'count' && data.recurrenceCount && data.due_date) {
                    // Calculate End Date based on count
                    const count = parseInt(data.recurrenceCount);
                    const start = new Date(data.due_date);
                    const frequency = data.recurrence;

                    if (!isNaN(count) && count > 0) {
                        const end = new Date(start);
                        if (frequency === 'daily') end.setDate(end.getDate() + count);
                        if (frequency === 'weekly') end.setDate(end.getDate() + (count * 7));
                        if (frequency === 'monthly') end.setMonth(end.getMonth() + count);
                        endDate = end.toISOString();
                    }
                }

                recurrenceRule = {
                    frequency: data.recurrence,
                    interval: 1, // Default interval is 1
                    endDate: endDate,
                    count: data.recurrenceEndType === 'count' ? parseInt(data.recurrenceCount) : undefined,
                    index: 1 // Start with the first occurrence
                };
            }

            const taskData = {
                title: data.title,
                description: data.description,
                type: data.type,
                priority: data.priority,
                categoryId: data.categoryId || undefined,
                dueAt: dueAt,
                reminderMinutes: parseInt(data.reminder),
                recurrenceRule: recurrenceRule,

                assigneeIds: selectedAssignees,
                createdBy: user.id,
                visibility: data.visibility,
                clinicId: propClinicId || user.user_metadata?.clinic_id // Get clinic_id from prop or metadata
            };

            if (taskToEdit) {
                // Update
                console.log('🔍 Updating task with data:', { taskId: taskToEdit.id, dueAt, originalDueAt: taskToEdit.dueAt });
                await taskService.updateTask(taskToEdit.id, taskData, user.id);
                toast.success('Tarefa atualizada com sucesso!');
            } else {
                // Create
                await taskService.createTask(taskData);
                toast.success('Tarefa criada com sucesso!');
            }

            onSuccess();
            window.dispatchEvent(new CustomEvent('task-updated'));
        } catch (error) {
            console.error('Error saving task:', error);
            toast.error('Erro ao salvar tarefa. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleAssignee = (userId: string) => {
        const current = selectedAssignees;
        if (current.includes(userId)) {
            setValue('assigneeIds', current.filter(id => id !== userId));
        } else {
            setValue('assigneeIds', [...current, userId]);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#2d181e] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">

                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">
                            {taskToEdit ? 'edit_note' : 'add_task'}
                        </span>
                        {taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-4 md:p-6 space-y-4 md:space-y-6">

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título da Tarefa *</label>
                        <input
                            {...register('title', { required: 'Título é obrigatório' })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                            placeholder="Ex: Verificar estoque de produtos"
                        />
                        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message as string}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição Detalhada</label>
                        <textarea
                            {...register('description')}
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white resize-none"
                            placeholder="Detalhe o que precisa ser feito..."
                        />
                    </div>

                    {/* Type & Priority Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Tarefa</label>
                            <div className="flex bg-gray-100 dark:bg-black/20 p-1 rounded-lg">
                                <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md cursor-pointer transition-all ${taskType === TaskType.ONE_TIME ? 'bg-white dark:bg-[#3d242a] shadow-sm text-primary font-medium' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                    <input type="radio" value={TaskType.ONE_TIME} {...register('type')} className="hidden" />
                                    <span className="material-symbols-outlined text-sm">event</span>
                                    Pontual
                                </label>
                                <label className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md cursor-pointer transition-all ${taskType === TaskType.RECURRING ? 'bg-white dark:bg-[#3d242a] shadow-sm text-primary font-medium' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                    <input type="radio" value={TaskType.RECURRING} {...register('type')} className="hidden" />
                                    <span className="material-symbols-outlined text-sm">update</span>
                                    Recorrente
                                </label>
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prioridade</label>
                            <select
                                {...register('priority')}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                            >
                                <option value={TaskPriority.LOW}>🟢 Baixa</option>
                                <option value={TaskPriority.MEDIUM}>🟡 Média</option>
                                <option value={TaskPriority.HIGH}>🟠 Alta</option>
                                <option value={TaskPriority.CRITICAL}>🔴 Crítica</option>
                            </select>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoria</label>
                            <select
                                {...register('categoryId')}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                                disabled={loadingCategories}
                            >
                                <option value="">Sem categoria</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Visibility */}
                    <div className="md:col-span-2 bg-gray-50 dark:bg-black/10 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Visibilidade da Tarefa</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <label className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${visibility === TaskVisibility.PRIVATE ? 'border-primary bg-primary/5' : 'border-transparent bg-white dark:bg-[#3d242a] hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                                <input type="radio" value={TaskVisibility.PRIVATE} {...register('visibility')} className="hidden" />
                                <span className="material-symbols-outlined text-2xl mb-1 text-gray-600 dark:text-gray-400">lock</span>
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">Privada</span>
                                <span className="text-[10px] text-gray-500 text-center mt-1">Visível apenas para mim</span>
                            </label>

                            <label className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${visibility === TaskVisibility.PUBLIC ? 'border-primary bg-primary/5' : 'border-transparent bg-white dark:bg-[#3d242a] hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                                <input type="radio" value={TaskVisibility.PUBLIC} {...register('visibility')} className="hidden" />
                                <span className="material-symbols-outlined text-2xl mb-1 text-gray-600 dark:text-gray-400">groups</span>
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">Pública (Clínica)</span>
                                <span className="text-[10px] text-gray-500 text-center mt-1">Todos da clínica podem ver</span>
                            </label>

                            <label className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${visibility === TaskVisibility.RESTRICTED ? 'border-primary bg-primary/5' : 'border-transparent bg-white dark:bg-[#3d242a] hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                                <input type="radio" value={TaskVisibility.RESTRICTED} {...register('visibility')} className="hidden" />
                                <span className="material-symbols-outlined text-2xl mb-1 text-gray-600 dark:text-gray-400">person_add</span>
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">Pessoas Específicas</span>
                                <span className="text-[10px] text-gray-500 text-center mt-1">Apenas eu e selecionados</span>
                            </label>
                        </div>
                    </div>

                    {/* Assignees (Multi-Select) - Show ONLY for RESTRICTED */}
                    {visibility === TaskVisibility.RESTRICTED && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Responsáveis ({selectedAssignees.length}) <span className="text-red-500 text-xs">(Obrigatório)</span>
                            </label>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50 dark:bg-black/10">
                                {loadingUsers ? (
                                    <div className="flex items-center justify-center py-4">
                                        <span className="material-symbols-outlined animate-spin text-gray-400">progress_activity</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {users.map(user => (
                                            <div
                                                key={user.id}
                                                onClick={() => toggleAssignee(user.id)}
                                                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors border ${selectedAssignees.includes(user.id) ? 'bg-primary/10 border-primary/30' : 'bg-white dark:bg-[#3d242a] border-transparent hover:border-gray-200 dark:hover:border-gray-600'}`}
                                            >
                                                <div className={`size-4 rounded border flex items-center justify-center ${selectedAssignees.includes(user.id) ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-500'}`}>
                                                    {selectedAssignees.includes(user.id) && <span className="material-symbols-outlined text-[10px] text-white">check</span>}
                                                </div>
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="size-6 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt={user.name} className="size-6 rounded-full object-cover" />
                                                        ) : (
                                                            user.name.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{user.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recurrence Options (Conditional) */}
                    {taskType === TaskType.RECURRING && (
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg border border-purple-100 dark:border-purple-800/30 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-sm font-bold text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined">repeat</span>
                                Configuração de Recorrência
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 uppercase">Frequência</label>
                                    <select
                                        {...register('recurrence')}
                                        className="w-full text-sm px-3 py-2 rounded-md border border-purple-200 dark:border-purple-800 bg-white dark:bg-black/20"
                                    >
                                        <option value="daily">Diária (Todos os dias)</option>
                                        <option value="weekly">Semanal (Mesmo dia da semana)</option>
                                        <option value="monthly">Mensal (Mesmo dia do mês)</option>
                                    </select>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                    * Uma nova tarefa será criada autom. ao concluir.
                                </p>
                            </div>

                            {/* Recurrence Limits */}
                            <div className="md:col-span-2 border-t border-purple-200 dark:border-purple-800 pt-3 mt-1">
                                <label className="block text-xs font-bold text-purple-800 dark:text-purple-300 mb-2 uppercase">Termina em:</label>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-4 text-sm">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" value="never" {...register('recurrenceEndType')} className="text-secondary focus:ring-secondary" />
                                            <span className="text-gray-700 dark:text-gray-300">Nunca</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" value="date" {...register('recurrenceEndType')} className="text-secondary focus:ring-secondary" />
                                            <span className="text-gray-700 dark:text-gray-300">Data Limite</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" value="count" {...register('recurrenceEndType')} className="text-secondary focus:ring-secondary" />
                                            <span className="text-gray-700 dark:text-gray-300">Após Nº Ocorrências</span>
                                        </label>
                                    </div>

                                    {/* Conditional Inputs for Limit */}
                                    {recurrenceEndType === 'date' && (
                                        <div className="animate-in fade-in slide-in-from-top-1">
                                            <input
                                                type="date"
                                                {...register('recurrenceEndDate')}
                                                className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-black/20"
                                            />
                                        </div>
                                    )}

                                    {recurrenceEndType === 'count' && (
                                        <div className="animate-in fade-in slide-in-from-top-1 flex items-center gap-2">
                                            <input
                                                type="number"
                                                {...register('recurrenceCount')}
                                                placeholder="Ex: 10"
                                                min="1"
                                                className="w-32 text-sm px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-black/20"
                                            />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">vezes</span>
                                        </div>
                                    )}

                                    {/* Helper Text */}
                                    {recurrenceFreq && (recurrenceEndType === 'date' && recurrenceEndDate && dueDate) && (
                                        <div className="text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 p-2 rounded">
                                            ℹ️ A tarefa se repetirá aproximadamente {
                                                Math.floor((new Date(recurrenceEndDate).getTime() - new Date(dueDate).getTime()) / (
                                                    recurrenceFreq === 'daily' ? 86400000 :
                                                        recurrenceFreq === 'weekly' ? 604800000 :
                                                            2592000000
                                                ))
                                            } vezes até {new Date(recurrenceEndDate).toLocaleDateString('pt-BR')}.
                                        </div>
                                    )}
                                    {recurrenceFreq && (recurrenceEndType === 'count' && recurrenceCount && dueDate) && (
                                        <div className="text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 p-2 rounded">
                                            ℹ️ Última ocorrência prevista em: {(() => {
                                                const count = parseInt(recurrenceCount);
                                                const start = new Date(dueDate);
                                                if (isNaN(count) || count <= 0) return '...';
                                                const end = new Date(start);
                                                if (recurrenceFreq === 'daily') end.setDate(end.getDate() + count);
                                                if (recurrenceFreq === 'weekly') end.setDate(end.getDate() + (count * 7));
                                                if (recurrenceFreq === 'monthly') end.setMonth(end.getMonth() + count);
                                                return end.toLocaleDateString('pt-BR');
                                            })()}
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    )}

                    {/* Date & Reminder */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Vencimento</label>
                            <input
                                type="date"
                                {...register('due_date', { required: true })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora</label>
                            <input
                                type="time"
                                {...register('due_time', { required: true })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lembrete</label>
                            <select
                                {...register('reminder')}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black/20 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                            >
                                <option value="5">5 minutos antes</option>
                                <option value="15">15 minutos antes</option>
                                <option value="30">30 minutos antes</option>
                                <option value="60">1 hora antes</option>
                                <option value="120">2 horas antes</option>
                            </select>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                                    Salvando...
                                </>
                            ) : (
                                taskToEdit ? 'Salvar Alterações' : 'Criar Tarefa'
                            )}
                        </button>
                    </div>

                </form>
            </div >
        </div >
    );
};
