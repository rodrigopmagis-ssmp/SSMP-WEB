import { supabase } from '../../lib/supabase';
import { TaskCategory } from '../../types';

export interface CreateCategoryData {
    name: string;
    description?: string;
    color: string;
    icon: string;
    clinicId: string;
}

export interface UpdateCategoryData {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    isActive?: boolean;
}

class TaskCategoryService {
    /**
     * Get all active categories (default + clinic-specific)
     */
    async getCategories(clinicId?: string): Promise<TaskCategory[]> {
        try {
            let query = supabase
                .from('task_categories')
                .select('*')
                .eq('is_active', true)
                .order('is_default', { ascending: false })
                .order('name');

            // Get default categories + clinic-specific categories
            if (clinicId) {
                query = query.or(`is_default.eq.true,clinic_id.eq.${clinicId}`);
            } else {
                query = query.eq('is_default', true);
            }

            const { data, error } = await query;

            if (error) throw error;

            return (data || []).map(cat => ({
                id: cat.id,
                name: cat.name,
                description: cat.description,
                color: cat.color,
                icon: cat.icon,
                clinicId: cat.clinic_id,
                isActive: cat.is_active,
                isDefault: cat.is_default,
                createdAt: cat.created_at,
                updatedAt: cat.updated_at,
                createdBy: cat.created_by
            }));
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }

    /**
     * Get category by ID
     */
    async getCategoryById(id: string): Promise<TaskCategory | null> {
        try {
            const { data, error } = await supabase
                .from('task_categories')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) return null;

            return {
                id: data.id,
                name: data.name,
                description: data.description,
                color: data.color,
                icon: data.icon,
                clinicId: data.clinic_id,
                isActive: data.is_active,
                isDefault: data.is_default,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                createdBy: data.created_by
            };
        } catch (error) {
            console.error('Error fetching category:', error);
            throw error;
        }
    }

    /**
     * Create a new category (admin only)
     */
    async createCategory(categoryData: CreateCategoryData, userId: string): Promise<TaskCategory> {
        try {
            const { data, error } = await supabase
                .from('task_categories')
                .insert({
                    name: categoryData.name,
                    description: categoryData.description,
                    color: categoryData.color,
                    icon: categoryData.icon,
                    clinic_id: categoryData.clinicId,
                    is_active: true,
                    is_default: false,
                    created_by: userId
                })
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                name: data.name,
                description: data.description,
                color: data.color,
                icon: data.icon,
                clinicId: data.clinic_id,
                isActive: data.is_active,
                isDefault: data.is_default,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                createdBy: data.created_by
            };
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        }
    }

    /**
     * Update category (admin only)
     */
    async updateCategory(id: string, updates: UpdateCategoryData): Promise<TaskCategory> {
        try {
            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.color !== undefined) updateData.color = updates.color;
            if (updates.icon !== undefined) updateData.icon = updates.icon;
            if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

            const { data, error } = await supabase
                .from('task_categories')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                name: data.name,
                description: data.description,
                color: data.color,
                icon: data.icon,
                clinicId: data.clinic_id,
                isActive: data.is_active,
                isDefault: data.is_default,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                createdBy: data.created_by
            };
        } catch (error) {
            console.error('Error updating category:', error);
            throw error;
        }
    }

    /**
     * Soft delete (inactivate) category
     */
    async inactivateCategory(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('task_categories')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error inactivating category:', error);
            throw error;
        }
    }

    /**
     * Get category statistics
     */
    async getCategoryStats(clinicId: string): Promise<{
        categoryId: string;
        categoryName: string;
        color: string;
        icon: string;
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        overdueTasks: number;
        avgCompletionTime?: number; // in hours
    }[]> {
        try {
            // This would require a more complex query or multiple queries
            // For now, returning a basic structure
            const categories = await this.getCategories(clinicId);

            const stats = await Promise.all(categories.map(async (category) => {
                const { data: tasks, error } = await supabase
                    .from('tasks')
                    .select('id, status, created_at, completed_at')
                    .eq('category_id', category.id)
                    .eq('clinic_id', clinicId);

                if (error) throw error;

                const totalTasks = tasks?.length || 0;
                const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
                const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
                const overdueTasks = tasks?.filter(t => t.status === 'overdue').length || 0;

                // Calculate average completion time
                const completedWithTime = tasks?.filter(t => t.completed_at && t.created_at) || [];
                let avgCompletionTime: number | undefined;

                if (completedWithTime.length > 0) {
                    const totalTime = completedWithTime.reduce((sum, task) => {
                        const created = new Date(task.created_at).getTime();
                        const completed = new Date(task.completed_at!).getTime();
                        return sum + (completed - created);
                    }, 0);
                    avgCompletionTime = (totalTime / completedWithTime.length) / (1000 * 60 * 60); // Convert to hours
                }

                return {
                    categoryId: category.id,
                    categoryName: category.name,
                    color: category.color,
                    icon: category.icon,
                    totalTasks,
                    completedTasks,
                    pendingTasks,
                    overdueTasks,
                    avgCompletionTime
                };
            }));

            return stats;
        } catch (error) {
            console.error('Error fetching category stats:', error);
            throw error;
        }
    }
}

export const taskCategoryService = new TaskCategoryService();
