import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { taskService } from '../../src/services/tasksService';
import { Task, TaskStatusEnum } from '../../types';
import { format, isPast, isToday, addHours, addMinutes, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface NotificationsPopoverProps {
    onTaskClick?: (task: Task) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ onTaskClick }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [postponingTaskId, setPostponingTaskId] = useState<string | null>(null);
    const [showPostponeMenu, setShowPostponeMenu] = useState<string | null>(null);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const myTasks = await taskService.getTasks({
                assigneeId: user.id,
                status: [TaskStatusEnum.PENDING, TaskStatusEnum.IN_PROGRESS] as any
            });

            const now = new Date();
            const relevantTasks = myTasks.filter(t => {
                if (!t.dueAt) return false;
                const dueDate = new Date(t.dueAt);
                // Somente tarefas ATRASADAS devem aparecer nas notificações.
                // Isso resolve o pedido de "sumir ao adiar" e "sumir ao concluir".
                // Se o usuário adiou, a data de vencimento passou a ser futura, então ela some.
                const isOverdue = (isPast(dueDate) && t.status !== TaskStatusEnum.COMPLETED && t.status !== TaskStatusEnum.CANCELLED);
                return isOverdue;
            });

            relevantTasks.sort((a, b) => {
                return (new Date(a.dueAt!).getTime()) - (new Date(b.dueAt!).getTime());
            });

            setTasks(relevantTasks);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePostpone = async (taskId: string, minutes: number) => {
        setPostponingTaskId(taskId);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const task = tasks.find(t => t.id === taskId);
            if (!task || !task.dueAt) return;

            // Sempre adiar a partir de AGORA para garantir que a tarefa saia do estado "Atrasada"
            // e suma das notificações conforme solicitado pelo usuário.
            const newDue = addMinutes(new Date(), minutes);

            await taskService.updateTask(taskId, {
                dueAt: newDue.toISOString()
            }, user.id);

            const label = minutes < 60 ? `${minutes} minutos` : minutes < 1440 ? `${minutes / 60} hora(s)` : `${minutes / 1440} dia(s)`;
            toast.success(`Tarefa adiada por ${label}`);

            setShowPostponeMenu(null);
            fetchNotifications();
        } catch (error) {
            console.error('Error postponing task:', error);
            toast.error('Erro ao adiar tarefa');
        } finally {
            setPostponingTaskId(null);
        }
    };

    const handleOpenTask = (task: Task) => {
        if (onTaskClick) {
            onTaskClick(task);
            setIsOpen(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);

        // Listen for global task updates to refresh notifications immediately
        const handleRefresh = () => fetchNotifications();
        window.addEventListener('task-updated', handleRefresh);
        window.addEventListener('tasks-changed', handleRefresh);

        return () => {
            clearInterval(interval);
            window.removeEventListener('task-updated', handleRefresh);
            window.removeEventListener('tasks-changed', handleRefresh);
        };
    }, []);

    const overdueCount = tasks.filter(t => isPast(new Date(t.dueAt!)) && t.status !== TaskStatusEnum.COMPLETED).length;

    return (
        <>
            {/* Notification Button */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors group"
                    title="Lembretes e Notificações"
                >
                    <span className={`material-symbols-outlined text-2xl ${overdueCount > 0 ? 'text-red-500 animate-pulse' : 'text-gray-500 dark:text-gray-400'}`}>
                        notifications
                    </span>
                    {tasks.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#2d181e]">
                            {tasks.length > 9 ? '9+' : tasks.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Backdrop Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
                    onClick={() => {
                        setIsOpen(false);
                        setShowPostponeMenu(null);
                    }}
                />
            )}

            {/* Sidebar Panel */}
            <div className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white dark:bg-[#1e1e1e] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-2xl">notifications_active</span>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white text-lg">Notificações</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {tasks.length === 0 ? 'Nenhuma pendência' : `${tasks.length} ${tasks.length === 1 ? 'tarefa' : 'tarefas'} pendente${tasks.length === 1 ? '' : 's'}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchNotifications}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Atualizar"
                        >
                            <span className="material-symbols-outlined text-xl">refresh</span>
                        </button>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setShowPostponeMenu(null);
                            }}
                            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            title="Fechar"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="h-[calc(100%-80px)] overflow-y-auto">
                    {loading && tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400">
                            <span className="material-symbols-outlined animate-spin text-4xl mb-4">progress_activity</span>
                            <p className="text-sm">Carregando notificações...</p>
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400">
                            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">notifications_off</span>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Tudo em dia!</h3>
                            <p className="text-sm">Nenhuma pendência urgente no momento.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {tasks.map(task => {
                                const dueDate = new Date(task.dueAt!);
                                const isLate = isPast(dueDate);

                                return (
                                    <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 pt-1">
                                                <div className={`size-3 rounded-full ${isLate ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-semibold text-base mb-1 ${isLate ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                                    {task.title}
                                                </h4>

                                                {task.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                                        {task.description}
                                                    </p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full ${isLate ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                        {isLate ? 'Atrasado desde ' : 'Vence '}
                                                        {format(dueDate, "dd/MM HH:mm")}
                                                    </span>
                                                    {task.priority === 'critical' && (
                                                        <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-bold uppercase">
                                                            Crítica
                                                        </span>
                                                    )}
                                                    {task.priority === 'high' && (
                                                        <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full font-medium uppercase">
                                                            Alta
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleOpenTask(task)}
                                                        className="flex-1 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                                        Abrir Tarefa
                                                    </button>

                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setShowPostponeMenu(showPostponeMenu === task.id ? null : task.id)}
                                                            disabled={postponingTaskId === task.id}
                                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                                                            Adiar
                                                        </button>

                                                        {showPostponeMenu === task.id && (
                                                            <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                <button
                                                                    onClick={() => handlePostpone(task.id, 15)}
                                                                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                                    15 minutos
                                                                </button>
                                                                <button
                                                                    onClick={() => handlePostpone(task.id, 30)}
                                                                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                                    30 minutos
                                                                </button>
                                                                <button
                                                                    onClick={() => handlePostpone(task.id, 60)}
                                                                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                                    1 hora
                                                                </button>
                                                                <button
                                                                    onClick={() => handlePostpone(task.id, 120)}
                                                                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                                    2 horas
                                                                </button>
                                                                <button
                                                                    onClick={() => handlePostpone(task.id, 1440)}
                                                                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">event</span>
                                                                    1 dia
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
