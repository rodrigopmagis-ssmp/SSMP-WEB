import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskPriority, TaskStatusEnum, TaskType, TaskComment, TaskVisibility, TaskAttachment } from '../../types';
import { taskService } from '../../src/services/tasksService';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskDetailsModalProps {
    task: Task;
    onClose: () => void;
    onEdit: (task: Task) => void;
    onUpdate: () => void;
    users: any[];
    clinicId?: string | null;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task: initialTask, users, clinicId: propClinicId, onClose, onEdit, onUpdate }) => {
    const [task, setTask] = useState(initialTask);
    const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history' | 'summary' | 'attachments'>('details');
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [history, setHistory] = useState<any[]>([]); // TODO: Type this properly
    const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
    const [loadingAttachments, setLoadingAttachments] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showAssigneeSelector, setShowAssigneeSelector] = useState(false);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    const [localAssigneeIds, setLocalAssigneeIds] = useState<string[]>(task.assigneeIds || []);

    useEffect(() => {
        setTask(initialTask);
        setLocalAssigneeIds(initialTask.assigneeIds || []);
    }, [initialTask]);

    const handleToggleAssignee = async (userId: string) => {
        const currentAssignees = localAssigneeIds;
        try {
            let newAssignees;

            if (currentAssignees.includes(userId)) {
                newAssignees = currentAssignees.filter(id => id !== userId);
            } else {
                newAssignees = [...currentAssignees, userId];
            }

            // Optimistic update
            setLocalAssigneeIds(newAssignees);
            setTask(prev => ({ ...prev, assigneeIds: newAssignees }));

            await taskService.updateTask(task.id, { assigneeIds: newAssignees }, currentUser?.id);
            toast.success('Responsáveis atualizados', { id: 'assignee-update' }); // Prevent duplicate toasts
            onUpdate();
        } catch (error) {
            console.error('Erro ao atualizar responsáveis:', error);
            toast.error('Erro ao atualizar responsáveis');
            // Revert on error
            setLocalAssigneeIds(currentAssignees);
        }
    };


    useEffect(() => {
        getCurrentUser();
        // Sempre carregar histórico para verificar status de adiamento
        loadHistory();
        if (activeTab === 'comments') {
            loadComments();
        }
        if (activeTab === 'attachments') {
            loadAttachments();
        }
    }, [activeTab, task.id]);

    // ... (rest of imports and code)

    // Check if task was recently postponed
    const lastAction = history.length > 0 ? history[0] : null;
    const isPostponed = lastAction?.action === 'POSTPONED';
    const postponedTime = isPostponed && lastAction?.details?.newDueAt ? new Date(lastAction.details.newDueAt) : null;

    useEffect(() => {
        // Scroll to bottom when comments change
        if (activeTab === 'comments' && commentsEndRef.current) {
            commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [comments, activeTab]);

    const getUserDetails = (userId: string) => {
        const user = users.find(u => u.id === userId);
        return user || { name: 'Usuário', avatar_url: null };
    };

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(user);
    };

    const loadComments = async () => {
        try {
            const data = await taskService.getTaskComments(task.id);
            setComments(data);
        } catch (error) {
            console.error('Erro ao carregar comentários:', error);
            toast.error('Erro ao carregar comentários');
        }
    };

    const loadHistory = async () => {
        try {
            const data = await taskService.getTaskHistory(task.id);
            setHistory(data);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    };

    const handleSendComment = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newComment.trim() || !currentUser) return;

        setSendingComment(true);
        try {
            await taskService.addComment(task.id, currentUser.id, newComment);
            setNewComment('');
            loadComments(); // Reload to get the new comment with user data
            toast.success('Comentário enviado');
        } catch (error) {
            console.error('Erro ao enviar comentário:', error);
            toast.error('Erro ao enviar comentário');
        } finally {
            setSendingComment(false);
        }
    };

    const loadAttachments = async () => {
        setLoadingAttachments(true);
        try {
            const data = await taskService.getTaskAttachments(task.id);
            setAttachments(data);
        } catch (error) {
            console.error('Erro ao carregar anexos:', error);
            toast.error('Erro ao carregar anexos');
        } finally {
            setLoadingAttachments(false);
        }
    };

    const handleUploadAttachment = async (file: File, category: 'comprovante_pagamento' | 'foto_paciente' | 'boleto') => {
        if (!currentUser) return;
        setIsUploading(true);
        try {
            // Tenta obter clinicId por ordem de prioridade: prop -> tarefa -> metadata -> objeto usuario
            const clinicId = propClinicId || task.clinicId || (currentUser as any).user_metadata?.clinic_id || (currentUser as any).clinic_id;

            if (!clinicId) {
                console.error('DEBUG: Clinic ID missing in TaskDetailsModal.', {
                    prop: propClinicId,
                    taskClinicId: task.clinicId,
                    metadata: (currentUser as any).user_metadata?.clinic_id,
                    userObj: (currentUser as any).clinic_id
                });
                throw new Error('ID da Clínica não encontrado. Por favor, tente recarregar a página.');
            }

            await taskService.uploadTaskAttachment(task.id, file, category, currentUser.id, clinicId);
            toast.success('Anexo enviado com sucesso');
            loadAttachments();
        } catch (error: any) {
            console.error('Erro ao enviar anexo:', error);
            const errorMessage = error.message || (typeof error === 'string' ? error : 'Erro desconhecido');
            toast.error(`Erro ao enviar anexo: ${errorMessage}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAttachment = async (attachment: TaskAttachment) => {
        if (!window.confirm('Tem certeza que deseja excluir este anexo?')) return;
        try {
            await taskService.deleteTaskAttachment(attachment.id, attachment.filePath, task.id, currentUser?.id || '');
            toast.success('Anexo excluído');
            loadAttachments();
        } catch (error) {
            console.error('Erro ao excluir anexo:', error);
            toast.error('Erro ao excluir anexo');
        }
    };

    const handleStatusChange = async (newStatus: TaskStatusEnum) => {
        try {
            if (newStatus === TaskStatusEnum.COMPLETED) {
                await taskService.completeTask(task.id, currentUser?.id);
            } else {
                await taskService.updateTask(task.id, { status: newStatus }, currentUser?.id);
            }

            setTask(prev => ({ ...prev, status: newStatus }));
            toast.success(newStatus === TaskStatusEnum.COMPLETED ? 'Tarefa concluída' : 'Status atualizado');
            onUpdate();
            window.dispatchEvent(new CustomEvent('task-updated'));
            // Don't close modal - let user see the updated status
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            toast.error('Erro ao atualizar status');
        }
    };

    const handleDelete = async () => {
        if (confirm('Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.')) {
            try {
                await taskService.deleteTask(task.id);
                toast.success('Tarefa excluída');
                onUpdate();
                onClose();
                window.dispatchEvent(new CustomEvent('task-updated'));
            } catch (error) {
                console.error('Erro ao excluir tarefa:', error);
                toast.error('Erro ao excluir tarefa');
            }
        }
    };

    const getPriorityColor = (priority: TaskPriority) => {
        switch (priority) {
            case TaskPriority.CRITICAL: return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
            case TaskPriority.HIGH: return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
            case TaskPriority.MEDIUM: return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
            case TaskPriority.LOW: return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getPriorityLabel = (priority: TaskPriority) => {
        switch (priority) {
            case TaskPriority.CRITICAL: return 'Crítica';
            case TaskPriority.HIGH: return 'Alta';
            case TaskPriority.MEDIUM: return 'Média';
            case TaskPriority.LOW: return 'Baixa';
            default: return priority;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#2d181e] rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-primary/10">

                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="flex flex-col gap-1 flex-1 mr-4">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white line-clamp-1">
                                    {task.title}
                                </h2>
                                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium uppercase tracking-wide ${getPriorityColor(task.priority)}`}>
                                    {getPriorityLabel(task.priority)}
                                </span>
                                {task.type === TaskType.RECURRING && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 text-xs font-bold border border-purple-100 dark:border-purple-800/50" title="Tarefa Recorrente">
                                        <span className="material-symbols-outlined text-sm">repeat</span>
                                        {task.recurrenceRule?.index || 1} de {task.recurrenceRule?.count || '∞'}
                                    </span>
                                )}
                            </div>

                            {/* Visualização de Adiamento (Estilo "Hand-drawn" conforme pedido) */}
                            {isPostponed && postponedTime && (
                                <div className="hidden md:flex items-center gap-2 transform -rotate-2 border-2 border-blue-500 rounded-full px-4 py-1 text-blue-600 font-handwriting bg-white dark:bg-[#2d181e] shadow-sm animate-in fade-in zoom-in duration-300">
                                    <span className="material-symbols-outlined text-xl">update</span>
                                    <span className="font-bold text-lg leading-none">
                                        Novo lembrete <span className="text-xl">{format(postponedTime, "HH:mm")}</span>
                                    </span>
                                </div>
                            )}
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                            <span className="material-symbols-outlined text-base">event</span>
                            Vence em {task.dueAt ? format(new Date(task.dueAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : 'Sem data'}
                            <span className="mx-2">•</span>
                            <span className="flex items-center gap-1">
                                {task.visibility === TaskVisibility.PRIVATE && <><span className="material-symbols-outlined text-base">lock</span> Privada</>}
                                {task.visibility === TaskVisibility.PUBLIC && <><span className="material-symbols-outlined text-base">groups</span> Pública</>}
                                {task.visibility === TaskVisibility.RESTRICTED && <><span className="material-symbols-outlined text-base">person_add</span> Restrita</>}
                            </span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors shrink-0"
                        title="Fechar"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex px-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#2d181e] shrink-0 gap-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'details'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <span className="material-symbols-outlined text-lg">info</span>
                        Detalhes
                    </button>
                    <button
                        onClick={() => setActiveTab('attachments')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'attachments'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <span className="material-symbols-outlined text-lg">attach_file</span>
                        Anexos
                    </button>
                    <button
                        onClick={() => setActiveTab('comments')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'comments'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <span className="material-symbols-outlined text-lg">chat</span>
                        Comentários
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'history'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <span className="material-symbols-outlined text-lg">history</span>
                        Histórico
                    </button>
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'summary'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <span className="material-symbols-outlined text-lg">integration_instructions</span>
                        Resumo (Automação)
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden bg-gray-50/50 dark:bg-black/20 relative">

                    {/* DETAILS TAB */}
                    {activeTab === 'details' && (
                        <div className="p-6 overflow-y-auto h-full custom-scrollbar space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Status Banner */}
                            <div className="flex items-center justify-between bg-white dark:bg-[#3d242a] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-full flex items-center justify-center ${task.status === TaskStatusEnum.COMPLETED ? 'bg-green-100 text-green-600' :
                                        task.status === TaskStatusEnum.IN_PROGRESS ? 'bg-blue-100 text-blue-600' :
                                            (task.status === TaskStatusEnum.PENDING || task.status === ('overdue' as any)) ? 'bg-gray-100 text-gray-600' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        <span className="material-symbols-outlined text-xl">
                                            {task.status === TaskStatusEnum.COMPLETED ? 'check_circle' :
                                                task.status === TaskStatusEnum.IN_PROGRESS ? 'play_arrow' : 'pending'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Status Atual</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="relative">
                                                <select
                                                    title="Status da Tarefa"
                                                    value={task.status === ('overdue' as any) ? TaskStatusEnum.PENDING : task.status}
                                                    onChange={(e) => handleStatusChange(e.target.value as TaskStatusEnum)}
                                                    className="appearance-none bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-0.5 pr-7 font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer text-sm"
                                                >
                                                    <option value={TaskStatusEnum.PENDING}>Pendente</option>
                                                    <option value={TaskStatusEnum.IN_PROGRESS}>Em Andamento</option>
                                                    <option value={TaskStatusEnum.COMPLETED}>Concluída</option>
                                                    <option value={TaskStatusEnum.CANCELLED}>Cancelada</option>
                                                </select>
                                                <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">
                                                    expand_more
                                                </span>
                                            </div>

                                            {/* Timing Badge - Bolder red blinking */}
                                            {task.dueAt && new Date(task.dueAt) < new Date() && task.status !== TaskStatusEnum.COMPLETED && task.status !== TaskStatusEnum.CANCELLED && (
                                                <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded uppercase animate-[pulse_1s_infinite] border border-red-700 shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                                                    Atrasada
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Status Actions */}
                                <div className="flex items-center gap-2">
                                    {(task.status === TaskStatusEnum.PENDING || task.status === ('overdue' as any)) && (
                                        <button
                                            onClick={() => handleStatusChange(TaskStatusEnum.IN_PROGRESS)}
                                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1 shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-base">play_arrow</span>
                                            Iniciar
                                        </button>
                                    )}
                                    {task.status === TaskStatusEnum.IN_PROGRESS && (
                                        <button
                                            onClick={() => handleStatusChange(TaskStatusEnum.COMPLETED)}
                                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1 shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-base">check</span>
                                            Concluir
                                        </button>
                                    )}
                                    {(task.status === TaskStatusEnum.COMPLETED || task.status === TaskStatusEnum.CANCELLED) && (
                                        <button
                                            onClick={() => handleStatusChange(TaskStatusEnum.IN_PROGRESS)}
                                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-base">replay</span>
                                            Reabrir
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-400">description</span>
                                    Descrição
                                </h3>
                                <div className="bg-white dark:bg-[#3d242a] p-6 rounded-xl border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-base leading-relaxed whitespace-pre-wrap shadow-sm min-h-[150px]">
                                    {task.description || <span className="text-gray-400 italic">Sem descrição detalhada.</span>}
                                </div>
                            </div>

                            {/* Meta Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Tipo da Tarefa</h4>
                                    <div className="flex items-center gap-3">
                                        <span className={`p-2.5 rounded-xl ${task.type === TaskType.RECURRING ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                            <span className="material-symbols-outlined text-2xl">
                                                {task.type === TaskType.RECURRING ? 'update' : 'event'}
                                            </span>
                                        </span>
                                        <div>
                                            <p className="text-base font-semibold text-gray-900 dark:text-white">
                                                {task.type === TaskType.RECURRING ? 'Recorrente' : 'Pontual'}
                                            </p>
                                            {task.type === TaskType.RECURRING && task.recurrenceRule && (
                                                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                                                    {task.recurrenceRule.frequency === 'daily' && 'Diariamente'}
                                                    {task.recurrenceRule.frequency === 'weekly' && 'Semanalmente'}
                                                    {task.recurrenceRule.frequency === 'monthly' && 'Mensalmente'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Responsáveis</h4>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowAssigneeSelector(!showAssigneeSelector)}
                                                className="text-xs text-primary hover:text-primary-dark font-medium flex items-center gap-1 hover:bg-primary/10 px-2 py-0.5 rounded transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">
                                                    {localAssigneeIds && localAssigneeIds.length > 0 ? 'edit' : 'person_add'}
                                                </span>
                                                {localAssigneeIds && localAssigneeIds.length > 0 ? 'Gerenciar' : 'Atribuir'}
                                            </button>

                                            {showAssigneeSelector && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setShowAssigneeSelector(false)}
                                                    />
                                                    <div className="absolute right-0 bottom-full mb-2 w-64 bg-white dark:bg-[#2d181e] rounded-xl shadow-xl border border-gray-100 dark:border-primary/20 z-20 py-2 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                                                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Selecione os responsáveis</p>
                                                        </div>
                                                        {users.map(user => {
                                                            const isAssigned = localAssigneeIds?.includes(user.id);
                                                            return (
                                                                <button
                                                                    key={user.id}
                                                                    onClick={() => handleToggleAssignee(user.id)}
                                                                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-sm transition-colors ${isAssigned
                                                                        ? 'bg-primary/5 text-primary font-medium'
                                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="size-6 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                                                                            {user.avatar_url ? (
                                                                                <img src={user.avatar_url} alt={user.name} className="size-full object-cover" />
                                                                            ) : (
                                                                                <span className="text-[10px] font-bold text-gray-500">{user.name?.charAt(0).toUpperCase()}</span>
                                                                            )}
                                                                        </div>
                                                                        <span className="truncate">{user.name}</span>
                                                                    </div>
                                                                    {isAssigned && <span className="material-symbols-outlined text-lg">check</span>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        {localAssigneeIds && localAssigneeIds.length > 0 ? (
                                            localAssigneeIds.map(assigneeId => {
                                                const user = users.find(u => u.id === assigneeId);
                                                if (!user) return null;
                                                return (
                                                    <div key={assigneeId} className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white dark:bg-[#3d242a] border border-gray-200 dark:border-gray-700" title={user.name}>
                                                        <div className="size-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                                            {user.avatar_url ? (
                                                                <img src={user.avatar_url} alt={user.name} className="size-full object-cover" />
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-gray-600">{user.name?.charAt(0).toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.name}</span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="text-sm text-gray-400 italic">Ninguém atribuído</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* COMMENTS TAB */}
                    {activeTab === 'comments' && (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {comments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <span className="material-symbols-outlined text-5xl mb-3 opacity-30">chat_bubble_outline</span>
                                        <p className="text-base font-medium">Nenhum comentário ainda.</p>
                                        <p className="text-sm opacity-70">Seja o primeiro a comentar!</p>
                                    </div>
                                ) : (
                                    comments.map(comment => {
                                        const userDetails = getUserDetails(comment.userId);
                                        return (
                                            <div key={comment.id} className={`flex gap-4 ${comment.userId === currentUser?.id ? 'flex-row-reverse' : ''}`}>
                                                <div className="size-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden shadow-sm">
                                                    {userDetails.avatar_url ? (
                                                        <img src={userDetails.avatar_url} alt="Avatar" className="size-full object-cover" />
                                                    ) : (
                                                        <div className="size-full flex items-center justify-center text-sm font-bold text-gray-500">
                                                            {userDetails.name?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${comment.userId === currentUser?.id
                                                    ? 'bg-primary text-white rounded-tr-none'
                                                    : 'bg-white dark:bg-[#3d242a] border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                                                    }`}>
                                                    <div className="flex items-center gap-2 mb-2 justify-between">
                                                        <span className={`text-xs font-bold ${comment.userId === currentUser?.id ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
                                                            {userDetails.name || 'Usuário'}
                                                        </span>
                                                        <span className={`text-[10px] ${comment.userId === currentUser?.id ? 'text-white/70' : 'text-gray-400'}`}>
                                                            {format(new Date(comment.createdAt), "dd/MM HH:mm")}
                                                        </span>
                                                    </div>
                                                    <p className="whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={commentsEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#2d181e]">
                                <form onSubmit={handleSendComment} className="flex gap-2 relative">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Escreva um comentário..."
                                        className="flex-1 pl-4 pr-12 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/20 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim() || sendingComment}
                                        className="absolute right-2 top-2 p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined">send</span>
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                        <div className="p-8 overflow-y-auto h-full custom-scrollbar animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
                                {history.length === 0 ? (
                                    <div className="pl-10 text-base text-gray-500 italic">Nenhum histórico registrado ainda.</div>
                                ) : (
                                    history.map((item, index) => {
                                        const userDetails = getUserDetails(item.userId || '');
                                        const isLast = index === history.length - 1;

                                        let iconColor = 'bg-gray-400';
                                        let actionIcon = 'info';
                                        let actionLabel = 'Ação desconhecida';
                                        let detailsText = '';

                                        switch (item.action) {
                                            case 'CREATED':
                                                iconColor = 'bg-green-500';
                                                actionIcon = 'add_task';
                                                actionLabel = 'Tarefa Criada';
                                                break;
                                            case 'UPDATED':
                                                iconColor = 'bg-blue-400';
                                                actionIcon = 'edit';
                                                actionLabel = 'Atualizada';
                                                if (item.details?.fields) {
                                                    const fieldMap: Record<string, string> = {
                                                        title: 'Título',
                                                        description: 'Descrição',
                                                        priority: 'Prioridade',
                                                        due_at: 'Prazo',
                                                        type: 'Tipo'
                                                    };
                                                    const translatedFields = item.details.fields.map((f: string) => fieldMap[f] || f);
                                                    detailsText = `Alterou: ${translatedFields.join(', ')}`;
                                                }
                                                break;
                                            case 'STATUS_CHANGE':
                                                iconColor = 'bg-purple-500';
                                                actionIcon = 'check_circle';
                                                actionLabel = 'Mudança de Status';
                                                if (item.details?.newStatus) {
                                                    const statusMap: Record<string, string> = {
                                                        pending: 'Pendente',
                                                        in_progress: 'Em Andamento',
                                                        completed: 'Concluída',
                                                        overdue: 'Atrasada',
                                                        cancelled: 'Cancelada'
                                                    };
                                                    detailsText = `Para: ${statusMap[item.details.newStatus] || item.details.newStatus}`;
                                                }
                                                break;
                                            case 'COMMENT_ADDED':
                                                iconColor = 'bg-yellow-500';
                                                actionIcon = 'comment';
                                                actionLabel = 'Comentou';
                                                break;
                                            case 'ASSIGNED':
                                                iconColor = 'bg-orange-500';
                                                actionIcon = 'person_add';
                                                actionLabel = 'Atribuição';
                                                detailsText = item.details?.count ? `${item.details.count} responsável(is)` : '';
                                                break;
                                            case 'POSTPONED':
                                                iconColor = 'bg-indigo-500';
                                                actionIcon = 'update';
                                                actionLabel = 'Tarefa Adiada';
                                                if (item.details?.newDueAt) {
                                                    detailsText = `Para: ${format(new Date(item.details.newDueAt), "dd/MM HH:mm")}`;
                                                }
                                                break;
                                        }

                                        return (
                                            <div key={item.id} className="relative pl-10 group" style={{ animationDelay: `${index * 50}ms` }}>
                                                <div className={`absolute left-0 top-0 size-10 ${iconColor} rounded-full border-4 border-white dark:border-[#2d181e] z-10 shadow-sm flex items-center justify-center text-white`}>
                                                    <span className="material-symbols-outlined text-sm">{actionIcon}</span>
                                                </div>
                                                <div className="bg-white dark:bg-[#3d242a] p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">

                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-bold text-gray-900 dark:text-white text-sm">
                                                                {actionLabel}
                                                            </p>
                                                            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                                                                {format(new Date(item.createdAt), "dd MMM 'às' HH:mm", { locale: ptBR })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                            por <span className="font-semibold text-primary">{userDetails.name || 'Sistema'}</span>
                                                        </p>
                                                        {detailsText && (
                                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-2 rounded-lg font-mono border border-gray-100 dark:border-white/5">
                                                                {detailsText}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* SUMMARY TAB (AUTOMATION) */}
                    {activeTab === 'summary' && (
                        <div className="p-6 overflow-y-auto h-full custom-scrollbar space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">


                            <div className="grid grid-cols-1 gap-6">
                                {/* Reminder Message */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-green-500">notifications_active</span>
                                            Mensagem de Lembrete
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    const msg = `🔔 *Lembrete de Tarefa*\n\n📌 *${task.title}*\n\n📅 *Vencimento:* ${task.dueAt ? format(new Date(task.dueAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Sem data'}\n👤 *Responsável:* ${localAssigneeIds.map(id => users.find(u => u.id === id)?.name).join(', ') || 'Sem responsável'}\n🔥 *Prioridade:* ${getPriorityLabel(task.priority)}\n\n📝 *Detalhes:* ${task.description || 'Sem descrição detalhada.'}`;
                                                    const encodedMsg = encodeURIComponent(msg);
                                                    window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
                                                }}
                                                className="text-xs flex items-center gap-1 text-green-600 hover:text-green-700 font-medium px-2 py-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                                title="Enviar por WhatsApp"
                                            >
                                                <span className="material-symbols-outlined text-sm">send</span>
                                                WhatsApp
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const msg = `🔔 *Lembrete de Tarefa*\n\n📌 *${task.title}*\n\n📅 *Vencimento:* ${task.dueAt ? format(new Date(task.dueAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Sem data'}\n👤 *Responsável:* ${localAssigneeIds.map(id => users.find(u => u.id === id)?.name).join(', ') || 'Sem responsável'}\n🔥 *Prioridade:* ${getPriorityLabel(task.priority)}\n\n📝 *Detalhes:* ${task.description || 'Sem descrição detalhada.'}`;
                                                    navigator.clipboard.writeText(msg);
                                                    toast.success('Copiado para a área de transferência');
                                                }}
                                                className="text-xs flex items-center gap-1 text-primary hover:text-primary-dark font-medium px-2 py-1 hover:bg-primary/5 rounded transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">content_copy</span>
                                                Copiar
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-gray-700 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed shadow-inner">
                                        {`🔔 *Lembrete de Tarefa*

📌 *${task.title}*

📅 *Vencimento:* ${task.dueAt ? format(new Date(task.dueAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Sem data'}
👤 *Responsável:* ${localAssigneeIds.map(id => users.find(u => u.id === id)?.name).join(', ') || 'Sem responsável'}
🔥 *Prioridade:* ${getPriorityLabel(task.priority)}

📝 *Detalhes:* ${task.description || 'Sem descrição detalhada.'}`}
                                    </div>
                                </div>

                                {/* Overdue Message */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-500">warning</span>
                                            Mensagem de Atraso
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    const msg = `⚠️ *Tarefa Atrasada*\n\n📌 *${task.title}*\n\n📅 *Venceu em:* ${task.dueAt ? format(new Date(task.dueAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Sem data'}\n👤 *Responsável:* ${localAssigneeIds.map(id => users.find(u => u.id === id)?.name).join(', ') || 'Sem responsável'}\n🔥 *Prioridade:* ${getPriorityLabel(task.priority)}\n\n❗ *Ação Necessária:* Esta tarefa está vencida. Favor verificar o andamento imediatamente.`;
                                                    const encodedMsg = encodeURIComponent(msg);
                                                    window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
                                                }}
                                                className="text-xs flex items-center gap-1 text-green-600 hover:text-green-700 font-medium px-2 py-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                                title="Enviar por WhatsApp"
                                            >
                                                <span className="material-symbols-outlined text-sm">send</span>
                                                WhatsApp
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const msg = `⚠️ *Tarefa Atrasada*\n\n📌 *${task.title}*\n\n📅 *Venceu em:* ${task.dueAt ? format(new Date(task.dueAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Sem data'}\n👤 *Responsável:* ${localAssigneeIds.map(id => users.find(u => u.id === id)?.name).join(', ') || 'Sem responsável'}\n🔥 *Prioridade:* ${getPriorityLabel(task.priority)}\n\n❗ *Ação Necessária:* Esta tarefa está vencida. Favor verificar o andamento imediatamente.`;
                                                    navigator.clipboard.writeText(msg);
                                                    toast.success('Copiado para a área de transferência');
                                                }}
                                                className="text-xs flex items-center gap-1 text-primary hover:text-primary-dark font-medium px-2 py-1 hover:bg-primary/5 rounded transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">content_copy</span>
                                                Copiar
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-gray-700 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed shadow-inner">
                                        {`⚠️ *Tarefa Atrasada*

📌 *${task.title}*

📅 *Venceu em:* ${task.dueAt ? format(new Date(task.dueAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Sem data'}
👤 *Responsável:* ${localAssigneeIds.map(id => users.find(u => u.id === id)?.name).join(', ') || 'Sem responsável'}
🔥 *Prioridade:* ${getPriorityLabel(task.priority)}

❗ *Ação Necessária:* Esta tarefa está vencida. Favor verificar o andamento imediatamente.`}
                                    </div>
                                </div>


                            </div>
                        </div>
                    )}

                    {/* ATTACHMENTS TAB */}
                    {activeTab === 'attachments' && (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {loadingAttachments ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        <p className="text-sm">Carregando anexos...</p>
                                    </div>
                                ) : attachments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <span className="material-symbols-outlined text-5xl mb-3 opacity-30">attach_file</span>
                                        <p className="text-base font-medium">Nenhum anexo encontrado.</p>
                                        <p className="text-sm opacity-70">Faça upload de documentos ou fotos.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {attachments.map(attachment => {
                                            const isImage = attachment.fileType.includes('image');
                                            return (
                                                <div key={attachment.id} className="bg-white dark:bg-[#3d242a] p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${isImage ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-500'
                                                            }`}>
                                                            <span className="material-symbols-outlined text-2xl">
                                                                {isImage ? 'image' : 'description'}
                                                            </span>
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={attachment.fileName}>
                                                                {attachment.fileName}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${attachment.category === 'comprovante_pagamento' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                                                    attachment.category === 'foto_paciente' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                                                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                                    }`}>
                                                                    {attachment.category.replace(/_/g, ' ')}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400">
                                                                    {formatFileSize(attachment.fileSize)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={async () => {
                                                                const url = await taskService.getAttachmentPublicUrl(attachment.filePath);
                                                                window.open(url, '_blank');
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors"
                                                            title="Visualizar"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">visibility</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAttachment(attachment)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                            title="Excluir"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Upload Area */}
                            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#2d181e] shrink-0">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                                        {[
                                            { id: 'comprovante_pagamento', label: 'Comprovante', icon: 'payments', color: 'text-green-500' },
                                            { id: 'foto_paciente', label: 'Foto Paciente', icon: 'patient_list', color: 'text-blue-500' },
                                            { id: 'boleto', label: 'Boleto', icon: 'description', color: 'text-yellow-500' }
                                        ].map(cat => (
                                            <label
                                                key={cat.id}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'
                                                    } bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 shadow-sm`}
                                            >
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    disabled={isUploading}
                                                    accept=".pdf,image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleUploadAttachment(file, cat.id as any);
                                                        // Reset input value to allow the same file to be uploaded again if needed
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <span className={`material-symbols-outlined text-sm ${cat.color}`}>{cat.icon}</span>
                                                {isUploading ? 'Enviando...' : `Anexar ${cat.label}`}
                                            </label>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-[10px] text-gray-400 italic">
                                            Formatos aceitos: PDF e Imagens (JPG, PNG). Tamanho máx: 10MB.
                                        </p>
                                        {isUploading && (
                                            <div className="flex items-center gap-2 text-[10px] text-primary font-bold animate-pulse">
                                                <span className="material-symbols-outlined text-xs animate-spin font-bold">sync</span>
                                                Realizando upload...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#2d181e] flex items-center justify-between shrink-0">
                    <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors text-sm font-medium"
                    >
                        <span className="material-symbols-outlined text-lg">delete</span>
                        Excluir Tarefa
                    </button>

                    <button
                        onClick={() => {
                            onEdit(task);
                            onClose();
                        }}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-white/5 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-gray-200"
                    >
                        <span className="material-symbols-outlined text-lg">edit</span>
                        Editar
                    </button>
                </div>
            </div>
        </div>
    );
};
