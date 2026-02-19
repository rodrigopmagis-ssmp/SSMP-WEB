import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { taskService } from '../../src/services/tasksService';
import { taskCategoryService } from '../../src/services/taskCategoryService';
import { Task, TaskPriority, TaskStatusEnum, TaskType, TaskCategory } from '../../types';
import toast from 'react-hot-toast';
import { TaskFormModal } from './TaskFormModal';
import { TasksList } from './TasksList';
import { TaskDetailsModal } from './TaskDetailsModal';
import { NotificationsPopover } from './NotificationsPopover';
import CategoryManagementModal from './CategoryManagementModal';

export const TasksDashboard: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]); // Filtered tasks for display
    const [allTasks, setAllTasks] = useState<Task[]>([]); // All tasks for stats calculation
    const [loading, setLoading] = useState(true);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewingTask, setViewingTask] = useState<Task | null>(null);
    const [users, setUsers] = useState<any[]>([]); // Cache de usuários para exibir nomes/avatares
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [isFirstLoad, setIsFirstLoad] = useState(true);

    // Category states
    const [categories, setCategories] = useState<TaskCategory[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [clinicId, setClinicId] = useState<string | null>(null);
    const [isGroupedByCategory, setIsGroupedByCategory] = useState(false);
    const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false);
    const analyticsRef = useRef<HTMLDivElement>(null);

    // Filters - Start with 'all', but will be set to PENDING on first load
    const [statusFilter, setStatusFilter] = useState<TaskStatusEnum | 'all'>('all');
    const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<TaskType | 'all'>('all'); // New: filter by type
    const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all');
    const [dueSoonFilter, setDueSoonFilter] = useState(false); // Special filter for "Vencendo 2h"

    // Quick Filters (substitui o antigo 'filter' único)
    const [quickFilter, setQuickFilter] = useState<'all' | 'my' | 'today'>('all');

    // Set default filter to PENDING on first load only
    useEffect(() => {
        if (isFirstLoad) {
            setStatusFilter('all'); // WAS: TaskStatusEnum.PENDING. Changed to 'all' to help debug visibility.
            setIsFirstLoad(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchUserInfo();
        fetchCategories();
    }, []);

    useEffect(() => {
        const init = async () => {
            await taskService.checkOverdueTasks();
            fetchTasks();

            // Support deep-linking from notifications
            const pendingTaskId = sessionStorage.getItem('pendingTaskId');
            if (pendingTaskId) {
                const t = await taskService.getTaskById(pendingTaskId);
                if (t) setViewingTask(t);
                sessionStorage.removeItem('pendingTaskId');
            }
        };
        init();
    }, [quickFilter, statusFilter, priorityFilter, typeFilter, assigneeFilter, dueSoonFilter, categoryFilter]);

    useEffect(() => {
        const handleOpenTaskEvent = async (event: any) => {
            const taskId = event.detail?.taskId;
            if (taskId) {
                const t = await taskService.getTaskById(taskId);
                if (t) setViewingTask(t);
            }
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (analyticsRef.current && !analyticsRef.current.contains(event.target as Node)) {
                setIsAnalyticsExpanded(false);
            }
        };

        window.addEventListener('open-task', handleOpenTaskEvent);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('open-task', handleOpenTaskEvent);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchUsers = async () => {
        setLoadingUsers(true);
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
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchUserInfo = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
                // Attempt to fetch profile for authoritative role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, clinic_id')
                    .eq('id', user.id)
                    .single();

                const role = profile?.role || user.user_metadata?.role || null;
                const userClinicId = profile?.clinic_id || user.user_metadata?.clinic_id || null;

                setCurrentUserRole(role);
                setClinicId(userClinicId);
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const clinicId = user.user_metadata?.clinic_id;
            const data = await taskCategoryService.getCategories(clinicId);
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const clinicId = user.user_metadata?.clinic_id;

            // Fetch ALL tasks first (for stats)
            // Fetch ALL tasks first (for stats)
            // Fix: Use correct role from profile or metadata (prefer profile if available from fetchUserInfo, but we can't depend on state here as it might be stale)
            // So we re-fetch briefly or check if we can reuse logic.
            // For now, let's fetch profile lightly or trust metadata if we updated it?
            // Actually, best is to query profile here too or use the state if set.
            // Let's use the same logic as fetchUserInfo
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const effectiveRole = profile?.role || user.user_metadata?.role;

            const allTasksParams: any = {
                userId: user.id,
                clinicId: clinicId,
                userRole: effectiveRole
            };
            const fetchedAllTasks = await taskService.getTasks(allTasksParams);
            setAllTasks(fetchedAllTasks);

            // Then fetch filtered tasks (for display)
            let fetchedTasks: Task[] = [];

            // Base params
            // Base params
            const params: any = {
                userId: user.id,
                clinicId: clinicId,
                userRole: effectiveRole
            };

            // Map 'overdue' virtual filter to actual fetch params
            if (statusFilter !== 'all' && statusFilter !== 'overdue') {
                params.status = statusFilter;
            }

            if (priorityFilter !== 'all') params.priority = priorityFilter;
            if (typeFilter !== 'all') params.type = typeFilter;
            if (categoryFilter !== 'all') params.categoryId = categoryFilter;

            // Logic resolution between Quick Filters and Manual Filters
            if (quickFilter === 'my') {
                params.assigneeId = user.id;
            } else if (quickFilter === 'today') {
                // If "today" is selected, we override date params
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                params.startDate = today.toISOString();
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                params.endDate = tomorrow.toISOString();
                params.assigneeId = user.id; // Usually "My Tasks Today" implies my tasks
            } else {
                // If manual assignee filter is set (and not in quick mode)
                if (assigneeFilter !== 'all') params.assigneeId = assigneeFilter;
            }

            fetchedTasks = await taskService.getTasks(params);

            // Apply client-side filters
            const now = new Date();

            // 1. Virtual 'overdue' filter
            if (statusFilter === 'overdue') {
                fetchedTasks = fetchedTasks.filter(t => {
                    if (!t.dueAt) return false;
                    return new Date(t.dueAt) < now && t.status !== TaskStatusEnum.COMPLETED && t.status !== TaskStatusEnum.CANCELLED;
                });
            }

            // 2. "Due soon" filter
            if (dueSoonFilter) {
                fetchedTasks = fetchedTasks.filter(t => {
                    if (!t.dueAt || t.status !== TaskStatusEnum.PENDING) return false;
                    const due = new Date(t.dueAt);
                    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
                    return diffHours > 0 && diffHours <= 2;
                });
            }

            setTasks(fetchedTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            toast.error('Erro ao carregar tarefas');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = () => {
        setEditingTask(null);
        setIsFormModalOpen(true);
    };

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setIsFormModalOpen(true);
    };

    const handleViewTask = (task: Task) => {
        setViewingTask(task);
    };

    const handleResetFilters = () => {
        setStatusFilter('all');
        setPriorityFilter('all');
        setTypeFilter('all');
        setAssigneeFilter('all');
        setCategoryFilter('all');
        setQuickFilter('all');
        setDueSoonFilter(false);
    };

    // Stats Calculation - Use allTasks instead of filtered tasks
    const stats = {
        overdue: allTasks.filter(t => {
            if (!t.dueAt) return false;
            return new Date(t.dueAt) < new Date() && t.status !== TaskStatusEnum.COMPLETED && t.status !== TaskStatusEnum.CANCELLED;
        }).length,
        dueSoon: allTasks.filter(t => {
            if (!t.dueAt) return false;
            const due = new Date(t.dueAt);
            const now = new Date();
            const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
            return diffHours > 0 && diffHours <= 2 && t.status === TaskStatusEnum.PENDING;
        }).length,
        pending: allTasks.filter(t => t.status === TaskStatusEnum.PENDING).length,
        recurring: allTasks.filter(t => t.type === TaskType.RECURRING).length,
    };

    // Group tasks by category
    const groupedTasks = categories.map(cat => ({
        category: cat,
        tasks: tasks.filter(t => t.categoryId === cat.id)
    })).filter(group => group.tasks.length > 0);

    const uncategorizedTasks = tasks.filter(t => !t.categoryId);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-[#2d181e] p-4 md:p-6 rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">check_circle</span>
                        Central de Demandas
                    </h1>
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Gerencie tarefas operacionais, lembretes e recorrências.</p>
                </div>

                <div className="flex flex-col gap-4">

                    {/* Filters Bar - Responsive Grid/Flex */}
                    <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-black/20 p-2 rounded-lg border border-gray-100 dark:border-white/5">
                        <select
                            value={quickFilter}
                            onChange={(e) => setQuickFilter(e.target.value as any)}
                            className="flex-1 min-w-[140px] bg-white dark:bg-[#2d181e] text-sm border-none rounded-md py-1.5 pl-2 pr-8 focus:ring-1 focus:ring-primary shadow-sm"
                            title="Filtro Rápido"
                        >
                            <option value="all">Todas</option>
                            <option value="my">Minhas</option>
                            <option value="today">Hoje</option>
                        </select>

                        <div className="hidden md:block w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1"></div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="flex-1 min-w-[120px] bg-transparent text-sm border-none py-1.5 focus:ring-0 text-gray-600 dark:text-gray-300"
                            title="Filtrar por Status"
                        >
                            <option value="all">Status: Todos</option>
                            <option value={TaskStatusEnum.PENDING}>Pendentes</option>
                            <option value={TaskStatusEnum.IN_PROGRESS}>Em Andamento</option>
                            <option value={TaskStatusEnum.COMPLETED}>Concluídas</option>
                            <option value="overdue">Atrasadas</option>
                        </select>

                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value as any)}
                            className="flex-1 min-w-[120px] bg-transparent text-sm border-none py-1.5 focus:ring-0 text-gray-600 dark:text-gray-300"
                            title="Filtrar por Prioridade"
                        >
                            <option value="all">Prioridade: Todas</option>
                            <option value={TaskPriority.CRITICAL}>Crítica</option>
                            <option value={TaskPriority.HIGH}>Alta</option>
                            <option value={TaskPriority.MEDIUM}>Média</option>
                            <option value={TaskPriority.LOW}>Baixa</option>
                        </select>

                        {quickFilter === 'all' && (
                            <select
                                value={assigneeFilter}
                                onChange={(e) => setAssigneeFilter(e.target.value)}
                                className="flex-1 min-w-[120px] bg-transparent text-sm border-none py-1.5 focus:ring-0 text-gray-600 dark:text-gray-300"
                                title="Filtrar por Responsável"
                            >
                                <option value="all">Resp: Todos</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name.split(' ')[0]}</option>
                                ))}
                            </select>
                        )}

                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="flex-1 min-w-[140px] bg-transparent text-sm border-none py-1.5 focus:ring-0 text-gray-600 dark:text-gray-300"
                            title="Filtrar por Categoria"
                        >
                            <option value="all">Categoria: Todas</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <NotificationsPopover onTaskClick={handleViewTask} />
                        <button
                            onClick={handleResetFilters}
                            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                            title="Limpar filtros e mostrar todas"
                        >
                            <span className="material-symbols-outlined text-xl">refresh</span>
                        </button>
                        <button
                            onClick={() => setIsGroupedByCategory(!isGroupedByCategory)}
                            className={`p-2 rounded-full transition-colors ${isGroupedByCategory ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                            title={isGroupedByCategory ? "Mostrar lista simples" : "Agrupar por Categoria"}
                        >
                            <span className="material-symbols-outlined text-xl">account_tree</span>
                        </button>
                        {(currentUserRole === 'admin' || currentUserRole === 'super_admin') && (
                            <button
                                onClick={() => setIsCategoryModalOpen(true)}
                                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                                title="Gerenciar Categorias"
                            >
                                <span className="material-symbols-outlined text-xl">category</span>
                            </button>
                        )}
                        <button
                            onClick={handleCreateTask}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium text-sm md:text-base"
                        >
                            <span className="material-symbols-outlined text-xl">add</span>
                            <span className="hidden leading-none md:inline">Nova Tarefa</span>
                            <span className="md:hidden">Nova</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Cards - Now Clickable Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Atrasadas */}
                <button
                    onClick={() => {
                        setStatusFilter('overdue');
                        setTypeFilter('all');
                        setPriorityFilter('all');
                        setQuickFilter('all');
                        setDueSoonFilter(false);
                    }}
                    className={`bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-800/30 flex items-center justify-between transition-all hover:shadow-md hover:scale-105 ${statusFilter === 'overdue' && typeFilter === 'all' && !dueSoonFilter ? 'ring-2 ring-red-500 shadow-lg' : ''}`}
                >
                    <div>
                        <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Atrasadas</p>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white">{stats.overdue}</h3>
                    </div>
                    <span className="material-symbols-outlined text-3xl text-red-400 dark:text-red-500/50">warning</span>
                </button>

                {/* Vencendo em Breve */}
                <button
                    onClick={() => {
                        setStatusFilter('all');
                        setTypeFilter('all');
                        setPriorityFilter('all');
                        setQuickFilter('all');
                        setDueSoonFilter(true);
                    }}
                    className={`bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30 flex items-center justify-between transition-all hover:shadow-md hover:scale-105 ${dueSoonFilter ? 'ring-2 ring-amber-500 shadow-lg' : ''}`}
                >
                    <div>
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Vencendo (2h)</p>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white">{stats.dueSoon}</h3>
                    </div>
                    <span className="material-symbols-outlined text-3xl text-amber-400 dark:text-amber-500/50">hourglass_top</span>
                </button>

                {/* Pendentes */}
                <button
                    onClick={() => {
                        setStatusFilter(TaskStatusEnum.PENDING);
                        setTypeFilter('all');
                        setPriorityFilter('all');
                        setQuickFilter('all');
                        setDueSoonFilter(false);
                    }}
                    className={`bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex items-center justify-between transition-all hover:shadow-md hover:scale-105 ${statusFilter === TaskStatusEnum.PENDING && typeFilter === 'all' && !dueSoonFilter ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
                >
                    <div>
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Pendentes</p>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white">{stats.pending}</h3>
                    </div>
                    <span className="material-symbols-outlined text-3xl text-blue-400 dark:text-blue-500/50">assignment</span>
                </button>

                {/* Recorrentes */}
                <button
                    onClick={() => {
                        setStatusFilter('all');
                        setTypeFilter(TaskType.RECURRING);
                        setPriorityFilter('all');
                        setQuickFilter('all');
                        setDueSoonFilter(false);
                    }}
                    className={`bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-800/30 flex items-center justify-between transition-all hover:shadow-md hover:scale-105 ${typeFilter === TaskType.RECURRING ? 'ring-2 ring-purple-500 shadow-lg' : ''}`}
                >
                    <div>
                        <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Recorrentes</p>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white">{stats.recurring}</h3>
                    </div>
                    <span className="material-symbols-outlined text-3xl text-purple-400 dark:text-purple-500/50">update</span>
                </button>
            </div>

            {/* Category Distribution / Reports */}
            <div
                ref={analyticsRef}
                className={`bg-white dark:bg-[#2d181e] rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm transition-all duration-300 overflow-hidden ${isAnalyticsExpanded ? 'p-6' : 'p-3'}`}
            >
                <div
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${isAnalyticsExpanded ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-black/20 text-gray-400 group-hover:text-primary group-hover:bg-primary/5'}`}>
                            <span className="material-symbols-outlined text-xl leading-none">analytics</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Distribuição por Categoria
                                {!isAnalyticsExpanded && (
                                    <span className="text-[10px] font-normal text-gray-400 bg-gray-100 dark:bg-black/20 px-1.5 py-0.5 rounded ml-1">
                                        Clique para expandir
                                    </span>
                                )}
                            </h2>
                            {isAnalyticsExpanded && <p className="text-xs text-gray-500 mt-1">Visão geral do volume de demandas por área.</p>}
                        </div>
                    </div>
                    <span className={`material-symbols-outlined transition-transform duration-300 ${isAnalyticsExpanded ? 'rotate-180' : ''} text-gray-400`}>
                        expand_more
                    </span>
                </div>

                {isAnalyticsExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 animate-in slide-in-from-top-2 duration-300">
                        {categories.map(cat => {
                            const count = allTasks.filter(t => t.categoryId === cat.id).length;
                            const percentage = allTasks.length > 0 ? (count / allTasks.length) * 100 : 0;

                            return (
                                <div key={cat.id} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg" style={{ color: cat.color }}>{cat.icon}</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white">{count}</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-1000 ease-out rounded-full"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: cat.color,
                                                boxShadow: `0 0 10px ${cat.color}40`
                                            }}
                                        ></div>
                                    </div>
                                    <p className="text-[10px] text-right text-gray-400 font-medium">{percentage.toFixed(1)}% do total</p>
                                </div>
                            );
                        })}

                        {/* Uncategorized Stats */}
                        {allTasks.filter(t => !t.categoryId).length > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg text-gray-400">category</span>
                                        <span className="font-medium text-gray-400">Sem Categoria</span>
                                    </div>
                                    <span className="font-bold text-gray-400">{allTasks.filter(t => !t.categoryId).length}</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gray-300 dark:bg-gray-600 rounded-full"
                                        style={{
                                            width: `${(allTasks.filter(t => !t.categoryId).length / allTasks.length) * 100}%`
                                        }}
                                    ></div>
                                </div>
                                <p className="text-[10px] text-right text-gray-400 font-medium">
                                    {((allTasks.filter(t => !t.categoryId).length / allTasks.length) * 100).toFixed(1)}% do total
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="bg-transparent space-y-6 min-h-[400px]">
                {loading ? (
                    <div className="bg-white dark:bg-[#2d181e] rounded-xl p-6 flex justify-center items-center h-40">
                        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                    </div>
                ) : isGroupedByCategory ? (
                    <div className="space-y-8">
                        {groupedTasks.map(group => (
                            <div key={group.category.id} className="space-y-3">
                                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-white/5 shadow-sm">
                                    <span className="material-symbols-outlined text-2xl" style={{ color: group.category.color }}>
                                        {group.category.icon}
                                    </span>
                                    <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-sm">
                                        {group.category.name} ({group.tasks.length})
                                    </h3>
                                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800 ml-2"></div>
                                </div>
                                <div className="bg-white dark:bg-[#2d181e] rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm overflow-hidden">
                                    <TasksList tasks={group.tasks} onUpdate={fetchTasks} users={users} onEdit={handleEditTask} onView={handleViewTask} />
                                </div>
                            </div>
                        ))}

                        {uncategorizedTasks.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-white/5 shadow-sm">
                                    <span className="material-symbols-outlined text-2xl text-gray-400">
                                        category
                                    </span>
                                    <h3 className="font-bold text-gray-400 uppercase tracking-wider text-sm">
                                        Sem Categoria ({uncategorizedTasks.length})
                                    </h3>
                                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800 ml-2"></div>
                                </div>
                                <div className="bg-white dark:bg-[#2d181e] rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm overflow-hidden">
                                    <TasksList tasks={uncategorizedTasks} onUpdate={fetchTasks} users={users} onEdit={handleEditTask} onView={handleViewTask} />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#2d181e] rounded-xl border border-gray-200 dark:border-primary/10 shadow-sm p-6 overflow-hidden">
                        <TasksList tasks={tasks} onUpdate={fetchTasks} users={users} onEdit={handleEditTask} onView={handleViewTask} />
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {isFormModalOpen && (
                <TaskFormModal
                    onClose={() => setIsFormModalOpen(false)}
                    onSuccess={() => {
                        setIsFormModalOpen(false);
                        fetchTasks();
                    }}
                    preloadedUsers={users}
                    taskToEdit={editingTask}
                />
            )}

            {/* Details/View Modal */}
            {viewingTask && (
                <TaskDetailsModal
                    task={viewingTask}
                    users={users}
                    onClose={() => setViewingTask(null)}
                    onEdit={(task) => {
                        setViewingTask(null);
                        handleEditTask(task);
                    }}
                    onUpdate={() => {
                        fetchTasks();
                    }}
                />
            )}

            {/* Category Management Modal (Admin Only) */}
            {isCategoryModalOpen && currentUserId && clinicId && (
                <CategoryManagementModal
                    isOpen={isCategoryModalOpen}
                    onClose={() => setIsCategoryModalOpen(false)}
                    clinicId={clinicId}
                    userId={currentUserId}
                    onCategoryCreated={() => {
                        fetchCategories();
                        fetchTasks();
                    }}
                />
            )}

        </div>
    );
};
