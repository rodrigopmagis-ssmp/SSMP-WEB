
import { supabase } from '../lib/supabase';
import { Task, TaskPriority, TaskStatusEnum, TaskType, TaskVisibility } from '../../types';

export interface CreateTaskDTO {
    title: string;
    description?: string;
    type: TaskType;
    priority: TaskPriority;
    categoryId?: string;
    dueAt?: string;
    reminderMinutes?: number;
    recurrenceRule?: Record<string, any>;
    assigneeIds: string[];
    createdBy: string;
    visibility: TaskVisibility;
    clinicId: string;
}

export interface UpdateTaskDTO extends Partial<Omit<CreateTaskDTO, 'createdBy' | 'clinicId'>> {
    status?: TaskStatusEnum;
    categoryId?: string;
}

export const taskService = {
    // Listar tarefas com filtros
    async getTasks(filters?: {
        status?: TaskStatusEnum | TaskStatusEnum[] | 'all';
        priority?: TaskPriority | 'all';
        type?: TaskType | 'all';
        categoryId?: string | 'all';
        assigneeId?: string;
        startDate?: string;
        endDate?: string;
        clinicId?: string;
        userId?: string;
    }) {
        let query = supabase
            .from('tasks')
            .select(`
                *,
                assignments:task_assignments(user_id),
                category:task_categories(id, name, color, icon, description)
            `)
            .order('due_at', { ascending: true }); // Ordenação secundária no js se precisar

        // Filtro por Clínica (Fundamental)
        if (filters?.clinicId) {
            query = query.eq('clinic_id', filters.clinicId);
        }

        // Aplicar filtros
        if (filters?.status && filters.status !== 'all') {
            if (Array.isArray(filters.status)) {
                query = query.in('status', filters.status);
            } else {
                query = query.eq('status', filters.status);
            }
        }

        if (filters?.priority && filters.priority !== 'all') {
            query = query.eq('priority', filters.priority);
        }

        if (filters?.type && filters.type !== 'all') {
            query = query.eq('type', filters.type);
        }

        if (filters?.categoryId && filters.categoryId !== 'all') {
            query = query.eq('category_id', filters.categoryId);
        }

        // Filtro por data
        if (filters?.startDate) {
            query = query.gte('due_at', filters.startDate);
        }

        if (filters?.endDate) {
            query = query.lte('due_at', filters.endDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Erro ao buscar tarefas:', error);
            throw error;
        }

        // Mapeamento snake_case (BD) -> camelCase (Frontend)
        let tasks = (data || []).map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            type: t.type,
            status: t.status === 'overdue' ? TaskStatusEnum.PENDING : t.status,
            priority: t.priority,
            categoryId: t.category_id,
            category: t.category ? {
                id: t.category.id,
                name: t.category.name,
                color: t.category.color,
                icon: t.category.icon,
                description: t.category.description,
                isActive: true,
                isDefault: false,
                clinicId: t.clinic_id,
                createdAt: t.created_at,
                updatedAt: t.updated_at
            } : undefined,
            dueAt: t.due_at,
            reminderMinutes: t.reminder_minutes,
            recurrenceRule: t.recurrence_rule,
            createdBy: t.created_by,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
            completedAt: t.completed_at,
            completedBy: t.completed_by,
            visibility: t.visibility || TaskVisibility.PRIVATE, // Default to Private if null
            clinicId: t.clinic_id,
            // Extrair IDs dos assignments
            assigneeIds: t.assignments?.map((a: any) => a.user_id) || []
        })) as Task[];

        // Filtrar VISIBILIDADE (Client-side filtering for simplicity and security if RLS not perfect)
        if (filters?.userId) {
            const currentUserId = filters.userId;
            tasks = tasks.filter(task => {
                // Criador sempre vê
                if (task.createdBy === currentUserId) return true;

                // Visibilidade Publica: todos da clínica veem (já filtrado por clinicId)
                if (task.visibility === TaskVisibility.PUBLIC) return true;

                // Se o usuário é o criador OU está atribuído à tarefa, ele pode ver
                // Isso cobre PRIVATE e RESTRICTED, garantindo que se foi delegado, a pessoa vê.
                if (task.createdBy === currentUserId || task.assigneeIds?.includes(currentUserId)) {
                    return true;
                }

                return false;
            });
        }

        // Filtrar por assigneeId específico se solicitado
        if (filters?.assigneeId) {
            tasks = tasks.filter(t => t.assigneeIds?.includes(filters.assigneeId!));
        }

        // Ordenação final (Data de vencimento ASC, depois Criação DESC)
        tasks.sort((a, b) => {
            const dateA = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
            const dateB = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
            if (dateA !== dateB) return dateA - dateB;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return tasks;
    },

    // Buscar tarefa por ID
    async getTaskById(id: string) {
        const { data, error } = await supabase
            .from('tasks')
            .select(`
                *,
                assignments:task_assignments(user_id),
                category:task_categories(id, name, color, icon, description)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Erro ao buscar tarefa por ID:', error);
            return null;
        }

        const t = data;
        return {
            id: t.id,
            title: t.title,
            description: t.description,
            type: t.type,
            status: t.status === 'overdue' ? TaskStatusEnum.PENDING : t.status,
            priority: t.priority,
            categoryId: t.category_id,
            category: t.category ? {
                id: t.category.id,
                name: t.category.name,
                color: t.category.color,
                icon: t.category.icon,
                description: t.category.description,
                isActive: true,
                isDefault: false,
                clinicId: t.clinic_id,
                createdAt: t.created_at,
                updatedAt: t.updated_at
            } : undefined,
            dueAt: t.due_at,
            reminderMinutes: t.reminder_minutes,
            recurrenceRule: t.recurrence_rule,
            createdBy: t.created_by,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
            completedAt: t.completed_at,
            completedBy: t.completed_by,
            visibility: t.visibility || TaskVisibility.PRIVATE,
            clinicId: t.clinic_id,
            assigneeIds: t.assignments?.map((a: any) => a.user_id) || []
        } as Task;
    },

    // Busca tarefas do dia para um usuário (atalho)
    async getMyTasksToday(userId: string, clinicId?: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.getTasks({
            userId: userId, // Importante passar userId para filtro de visibilidade
            assigneeId: userId, // filtra tarefas atribuídas a ele explicitamente
            clinicId: clinicId,
            status: 'pending' as any,
            startDate: today.toISOString(),
            endDate: tomorrow.toISOString()
        });
    },

    // Criar tarefa
    async createTask(task: CreateTaskDTO) {
        // 1. Criar a task
        const { data: newTask, error: taskError } = await supabase
            .from('tasks')
            .insert({
                title: task.title,
                description: task.description,
                type: task.type,
                priority: task.priority,
                category_id: task.categoryId,
                due_at: task.dueAt,
                reminder_minutes: task.reminderMinutes,
                recurrence_rule: task.recurrenceRule,
                created_by: task.createdBy,
                status: TaskStatusEnum.PENDING,
                visibility: task.visibility,
                clinic_id: task.clinicId
            })
            .select()
            .single();

        if (taskError) throw taskError;

        // Log CREATED
        await this.logHistory(newTask.id, task.createdBy, 'CREATED', { title: task.title });

        // 2. Criar atribuições
        if (task.assigneeIds && task.assigneeIds.length > 0) {
            const assignments = task.assigneeIds.map(userId => ({
                task_id: newTask.id,
                user_id: userId
            }));

            const { error: assignmentError } = await supabase
                .from('task_assignments')
                .insert(assignments);

            if (assignmentError) console.error('Erro ao atribuir responsáveis:', assignmentError);

            // Log ASSIGNED (generic)
            await this.logHistory(newTask.id, task.createdBy, 'ASSIGNED', { count: task.assigneeIds.length });
        }

        return newTask;
    },

    // Atualizar tarefa
    async updateTask(id: string, updates: UpdateTaskDTO, userId?: string) {
        const { assigneeIds, ...taskFields } = updates;

        // Map DTO (camelCase) to DB (snake_case)
        const dbUpdates: any = {};
        if (taskFields.title !== undefined) dbUpdates.title = taskFields.title;
        if (taskFields.description !== undefined) dbUpdates.description = taskFields.description;
        if (taskFields.type !== undefined) dbUpdates.type = taskFields.type;
        if (taskFields.priority !== undefined) dbUpdates.priority = taskFields.priority;
        if (taskFields.categoryId !== undefined) dbUpdates.category_id = taskFields.categoryId;
        if (taskFields.status !== undefined) dbUpdates.status = taskFields.status;
        if (taskFields.dueAt !== undefined) dbUpdates.due_at = taskFields.dueAt;
        if (taskFields.reminderMinutes !== undefined) dbUpdates.reminder_minutes = taskFields.reminderMinutes;
        if (taskFields.recurrenceRule !== undefined) dbUpdates.recurrence_rule = taskFields.recurrenceRule;
        if (taskFields.visibility !== undefined) dbUpdates.visibility = taskFields.visibility;
        // clinicId usually not updated

        // Remove undefined keys just in case
        Object.keys(dbUpdates).forEach(key => dbUpdates[key] === undefined && delete dbUpdates[key]);

        // 1. Atualizar campos da task (se houver)
        let data = null;
        if (Object.keys(dbUpdates).length > 0) {
            const { data: updatedData, error } = await supabase
                .from('tasks')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            data = updatedData;

            // Log Updates specific to task fields
            if (userId) {
                if (dbUpdates.status) {
                    await this.logHistory(id, userId, 'STATUS_CHANGE', { newStatus: dbUpdates.status });
                } else {
                    // Log keys that were actually updated (exclude internal ones if any)
                    await this.logHistory(id, userId, 'UPDATED', { fields: Object.keys(dbUpdates) });
                }
            }
        }

        // 2. Atualizar atribuições
        if (assigneeIds) {
            await supabase.from('task_assignments').delete().eq('task_id', id);

            if (assigneeIds.length > 0) {
                const assignments = assigneeIds.map(uId => ({
                    task_id: id,
                    user_id: uId
                }));
                await supabase.from('task_assignments').insert(assignments);

                if (userId) {
                    await this.logHistory(id, userId, 'ASSIGNED', { count: assigneeIds.length });
                }
            }
        }

        return data;
    },

    // Concluir tarefa
    async completeTask(id: string, userId: string) {
        // ... (existing recurrence logic) ...
        const { data: originalTask, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Recorrência
        if (originalTask.type === TaskType.RECURRING && originalTask.recurrence_rule) {
            // ... (existing logic truncated for brevity, assume typical recurrence handling) ...
            try {
                const rule = originalTask.recurrence_rule as any;
                const currentDue = new Date(originalTask.due_at || new Date());
                let nextDue = new Date(currentDue);

                // Keep logic roughly same, simple calc
                if (rule.frequency === 'daily') nextDue.setDate(nextDue.getDate() + (rule.interval || 1));
                else if (rule.frequency === 'weekly') nextDue.setDate(nextDue.getDate() + 7 * (rule.interval || 1));
                else if (rule.frequency === 'monthly') nextDue.setMonth(nextDue.getMonth() + (rule.interval || 1));

                const { data: assignments } = await supabase.from('task_assignments').select('user_id').eq('task_id', id);
                const assigneeIds = assignments?.map(a => a.user_id) || [];

                // Incrementar index
                const nextIndex = (rule.index || 1) + 1;

                // Se houver limite de ocorrências, verificar se chegamos ao fim
                if (rule.count && nextIndex > rule.count) {
                    console.log('Recorrência finalizada pelo limite de contagem');
                } else {
                    await this.createTask({
                        title: originalTask.title,
                        description: originalTask.description,
                        type: TaskType.RECURRING,
                        priority: originalTask.priority,
                        dueAt: nextDue.toISOString(),
                        reminderMinutes: originalTask.reminder_minutes,
                        recurrenceRule: {
                            ...rule,
                            index: nextIndex
                        },
                        assigneeIds: assigneeIds,
                        createdBy: userId,
                        visibility: originalTask.visibility || TaskVisibility.PRIVATE, // Maintain visibility
                        clinicId: originalTask.clinic_id
                    });
                    console.log(`Recurrence created: ${nextIndex} ${rule.count ? `of ${rule.count}` : ''}`);
                }
            } catch (e) {
                console.error('Recurrence error', e);
            }
        }

        const res = await this.updateTask(id, {
            status: TaskStatusEnum.COMPLETED,
        } as any, userId);

        return res;
    },

    // Excluir tarefa 
    async deleteTask(id: string) {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ... (checkOverdueTasks remains same) ...
    async checkOverdueTasks() {
        // This function no longer updates the primary 'status' column to 'overdue'.
        // Workflow status (Pending, In Progress, etc.) is now separate from timing status (Overdue).
        // Overdue status is calculated dynamically in the frontend based on dueAt.
        return;
    },

    async getTaskComments(taskId: string) {
        // ... (existing implementation) ...
        const { data, error } = await supabase.from('task_comments').select('*').eq('task_id', taskId).order('created_at', { ascending: true });
        if (error) throw error;
        return data.map((item: any) => ({
            id: item.id, taskId: item.task_id, userId: item.user_id, content: item.content, clearfix: item.created_at, createdAt: item.created_at
        }));
    },

    async addComment(taskId: string, userId: string, content: string) {
        const { data, error } = await supabase
            .from('task_comments')
            .insert({ task_id: taskId, user_id: userId, content: content })
            .select()
            .single();

        if (error) throw error;

        await this.logHistory(taskId, userId, 'COMMENT_ADDED', {});
        return data;
    },

    // History Methods
    async logHistory(taskId: string, userId: string, action: string, details: any = {}) {
        const { error } = await supabase
            .from('task_history')
            .insert({
                task_id: taskId,
                user_id: userId,
                action,
                details
            });

        if (error) console.error('Error logging history:', error);
    },

    async getTaskHistory(taskId: string) {
        const { data, error } = await supabase
            .from('task_history')
            .select('*')
            .eq('task_id', taskId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((item: any) => ({
            id: item.id,
            taskId: item.task_id,
            userId: item.user_id,
            action: item.action,
            details: item.details,
            createdAt: item.created_at
        }));
    }
};
