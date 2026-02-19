
import React from 'react';
import { Task, TaskPriority, TaskStatusEnum, TaskType, TaskVisibility } from '../../types';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { taskService } from '../../src/services/tasksService';
import toast from 'react-hot-toast';

interface User {
    id: string;
    name: string;
    avatar_url?: string | null;
    email: string;
}

interface TasksListProps {
    tasks: Task[];
    onUpdate: () => void;
    users: User[];
    onEdit: (task: Task) => void;
    onView: (task: Task) => void;
}

export const TasksList: React.FC<TasksListProps> = ({ tasks, onUpdate, users, onEdit, onView }) => {



    const getPriorityColor = (priority: TaskPriority) => {
        switch (priority) {
            case TaskPriority.CRITICAL: return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
            case TaskPriority.HIGH: return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800';
            case TaskPriority.MEDIUM: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
            case TaskPriority.LOW: return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
            default: return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
        }
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

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isToday(date)) return <span className="text-amber-600 dark:text-amber-400 font-bold">Hoje, {format(date, 'HH:mm')}</span>;
        if (isTomorrow(date)) return <span className="text-blue-600 dark:text-blue-400">Amanhã, {format(date, 'HH:mm')}</span>;
        if (isPast(date)) return <span className="text-red-600 dark:text-red-400 font-bold">{format(date, 'dd/MM/yyyy HH:mm')}</span>;
        return format(date, 'dd/MM/yyyy HH:mm');
    };

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">task_alt</span>
                <p className="text-lg font-medium">Nenhuma tarefa encontrada</p>
                <p className="text-sm">Crie uma nova tarefa para começar.</p>
            </div>
        );
    }

    return (
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto bg-white dark:bg-[#2d181e] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-black/20 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-800/50">
                            <th className="px-6 py-4 font-semibold text-center w-16">#</th>
                            <th className="px-4 py-4 font-semibold w-10 text-center">Cat</th>
                            <th className="px-6 py-4 font-semibold">Título</th>
                            <th className="px-6 py-4 font-semibold">Prazo</th>
                            <th className="px-6 py-4 font-semibold">Prioridade</th>
                            <th className="px-6 py-4 font-semibold">Responsáveis</th>
                            <th className="px-6 py-4 font-semibold text-center">Status</th>
                            <th className="px-6 py-4 font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                        {tasks.map((task, index) => (
                            <tr
                                key={task.id}
                                className={`group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${task.status === TaskStatusEnum.COMPLETED ? 'bg-gray-50/50 dark:bg-black/10' : ''}`}
                            >
                                {/* # Index or Icon */}
                                <td className="px-6 py-4 text-center text-gray-400 text-sm">
                                    {task.type === TaskType.RECURRING ? (
                                        <div className="inline-flex flex-col items-center justify-center min-w-[20px]">
                                            <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 leading-none mb-0.5" title={`Ocorrência nº ${task.recurrenceRule?.index || 1}`}>
                                                {task.recurrenceRule?.index || 1}
                                            </span>
                                            <span className="material-symbols-outlined text-purple-500 text-[18px] leading-none" title={`Tarefa Recorrente (${task.recurrenceRule?.index || 1} de ${task.recurrenceRule?.count || '∞'})`}>
                                                repeat
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs font-mono">{String(index + 1).padStart(2, '0')}</span>
                                    )}
                                </td>

                                {/* Compact Category Icon */}
                                <td className="px-4 py-4 text-center">
                                    {task.category ? (
                                        <div
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg shadow-sm"
                                            style={{
                                                backgroundColor: `${task.category.color}15`,
                                                color: task.category.color,
                                                border: `1px solid ${task.category.color}30`
                                            }}
                                            title={task.category.name}
                                        >
                                            <span className="material-symbols-outlined text-[20px] leading-none">
                                                {task.category.icon}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="material-symbols-outlined text-gray-300 dark:text-gray-700 text-lg" title="Sem Categoria">category</span>
                                    )}
                                </td>

                                {/* Title & Description */}
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium text-gray-900 dark:text-gray-100 ${task.status === TaskStatusEnum.COMPLETED ? 'line-through text-gray-400 dark:text-gray-600' : ''}`}>
                                                {task.title}
                                            </span>
                                            {task.visibility === TaskVisibility.PRIVATE && <span className="material-symbols-outlined text-[14px] text-gray-400" title="Privada">lock</span>}
                                            {task.visibility === TaskVisibility.PUBLIC && <span className="material-symbols-outlined text-[14px] text-blue-400" title="Pública">groups</span>}
                                        </div>
                                        {task.description && (
                                            <span className="text-xs text-gray-500 dark:text-gray-500 line-clamp-1 mt-0.5">
                                                {task.description}
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Due Date */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    <span className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-lg opacity-70">event</span>
                                        {formatDate(task.dueAt)}
                                    </span>
                                </td>

                                {/* Priority */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                        {getPriorityLabel(task.priority)}
                                    </span>
                                </td>

                                {/* Assignees */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex -space-x-2">
                                        {task.assigneeIds?.map((id) => {
                                            const user = users.find(u => u.id === id);
                                            const initials = user ? user.name.charAt(0).toUpperCase() : '?';
                                            return (
                                                <div key={id} className="size-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-[#2d181e] flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 font-bold overflow-hidden" title={user?.name || 'Desconhecido'}>
                                                    {user?.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user.name} className="size-full object-cover" />
                                                    ) : (
                                                        initials
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {(!task.assigneeIds || task.assigneeIds.length === 0) && (
                                            <span className="text-xs text-gray-400 italic">--</span>
                                        )}
                                    </div>
                                </td>

                                {/* Status (Badge Only) */}
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${task.status === TaskStatusEnum.COMPLETED ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                                            task.status === TaskStatusEnum.IN_PROGRESS ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                                                'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                            }`}>
                                            <span className={`size-2 rounded-full ${task.status === TaskStatusEnum.COMPLETED ? 'bg-green-500' :
                                                task.status === TaskStatusEnum.IN_PROGRESS ? 'bg-blue-500 animate-pulse' :
                                                    'bg-gray-400'
                                                }`}></span>
                                            {task.status === TaskStatusEnum.PENDING && 'Pendente'}
                                            {task.status === TaskStatusEnum.IN_PROGRESS && 'Em Andamento'}
                                            {task.status === TaskStatusEnum.COMPLETED && 'Concluída'}
                                            {task.status === TaskStatusEnum.CANCELLED && 'Cancelada'}
                                        </span>

                                        {/* Timing Alert - Blinking red */}
                                        {task.dueAt && new Date(task.dueAt) < new Date() && task.status !== TaskStatusEnum.COMPLETED && task.status !== TaskStatusEnum.CANCELLED && (
                                            <span className="flex items-center gap-0.5 text-[10px] font-black text-red-600 animate-[pulse_1s_infinite] uppercase tracking-tighter">
                                                <span className="material-symbols-outlined text-xs font-black">warning</span>
                                                Atrasada
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Actions (View Only) */}
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <button
                                        onClick={() => onView(task)}
                                        className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                                        title="Visualizar Detalhes"
                                    >
                                        <span className="material-symbols-outlined">visibility</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        onClick={() => onView(task)}
                        className={`bg-white dark:bg-[#2d181e] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-95 transition-transform ${task.status === TaskStatusEnum.COMPLETED ? 'opacity-75 bg-gray-50 dark:bg-black/20' : ''}`}
                    >
                        {/* Header: Cat Icon + Title + Status Dot */}
                        <div className="flex items-start gap-3 mb-3">
                            {/* Category Icon */}
                            <div
                                className="flex-shrink-0 inline-flex items-center justify-center size-10 rounded-lg shadow-sm"
                                style={{
                                    backgroundColor: task.category ? `${task.category.color}15` : '#f3f4f6',
                                    color: task.category ? task.category.color : '#9ca3af',
                                    border: `1px solid ${task.category ? task.category.color + '30' : '#e5e7eb'}`
                                }}
                            >
                                <span className="material-symbols-outlined text-xl">
                                    {task.category ? task.category.icon : 'category'}
                                </span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    {/* Priority Badge */}
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(task.priority)}`}>
                                        {getPriorityLabel(task.priority)}
                                    </span>

                                    {/* Visibility Icon */}
                                    {task.visibility === TaskVisibility.PRIVATE && <span className="material-symbols-outlined text-[14px] text-gray-400 ml-auto" title="Privada">lock</span>}
                                    {task.visibility === TaskVisibility.PUBLIC && <span className="material-symbols-outlined text-[14px] text-blue-400 ml-auto" title="Pública">groups</span>}
                                </div>

                                <h3 className={`font-bold text-gray-900 dark:text-white mt-1 text-sm leading-tight ${task.status === TaskStatusEnum.COMPLETED ? 'line-through text-gray-500' : ''}`}>
                                    {task.title}
                                </h3>
                            </div>
                        </div>

                        {/* Description Quote */}
                        {task.description && (
                            <div className="mb-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 bg-gray-50 dark:bg-black/20 p-2 rounded-lg italic border-l-2 border-gray-200 dark:border-gray-700">
                                "{task.description}"
                            </div>
                        )}

                        {/* Footer: Date, Assignees, Status */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800/50">
                            {/* Date */}
                            <div className="flex items-center gap-1 text-xs">
                                <span className={`material-symbols-outlined text-sm ${task.dueAt && new Date(task.dueAt) < new Date() && task.status !== TaskStatusEnum.COMPLETED ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>event</span>
                                {formatDate(task.dueAt)}
                            </div>

                            {/* Assignees Avatars */}
                            <div className="flex -space-x-2">
                                {task.assigneeIds?.slice(0, 3).map((id) => {
                                    const user = users.find(u => u.id === id);
                                    const initials = user ? user.name.charAt(0).toUpperCase() : '?';
                                    return (
                                        <div key={id} className="size-6 rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-[#2d181e] flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-300 font-bold overflow-hidden">
                                            {user?.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.name} className="size-full object-cover" />
                                            ) : (
                                                initials
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};
