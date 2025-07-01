import { supabase } from '@/integrations/supabase/client';
import { Task, ScheduledAction } from '@/types/Task';
import { APP_CONFIG } from '@/config/app.config';
import { validateTask, sanitizeContactInfo } from '@/utils/validation';

class DatabaseService {
  private retryCount = 0;
  private maxRetries = APP_CONFIG.MAX_RETRY_ATTEMPTS;

  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      const result = await operation();
      this.retryCount = 0; // Reset on success
      return result;
    } catch (error) {
      console.error(`${context} failed:`, error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying ${context} (attempt ${this.retryCount}/${this.maxRetries})`);
        
        await new Promise(resolve => 
          setTimeout(resolve, APP_CONFIG.RETRY_DELAY * this.retryCount)
        );
        
        return this.withRetry(operation, context);
      }
      
      throw error;
    }
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    return this.withRetry(async () => {
      // Validate input
      const validatedTask = validateTask({
        ...taskData,
        id: 'temp', // Will be replaced by database
        createdAt: new Date().toISOString(),
      });

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: validatedTask.title,
          description: validatedTask.description,
          priority: validatedTask.priority,
          due_date: validatedTask.dueDate,
          completed: validatedTask.completed,
          action_type: validatedTask.actionType,
          scheduled_for: validatedTask.scheduledFor,
          contact_info: sanitizeContactInfo(validatedTask.contactInfo),
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        priority: data.priority as 'low' | 'medium' | 'high',
        dueDate: data.due_date || undefined,
        completed: data.completed,
        createdAt: data.created_at,
        actionType: data.action_type as Task['actionType'],
        scheduledFor: data.scheduled_for || undefined,
        contactInfo: data.contact_info || undefined,
      };
    }, 'Create task');
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    return this.withRetry(async () => {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: updates.title,
          description: updates.description,
          priority: updates.priority,
          due_date: updates.dueDate,
          completed: updates.completed,
          action_type: updates.actionType,
          scheduled_for: updates.scheduledFor,
          contact_info: sanitizeContactInfo(updates.contactInfo),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;
    }, 'Update task');
  }

  async deleteTask(taskId: string): Promise<void> {
    return this.withRetry(async () => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    }, 'Delete task');
  }

  async getTasks(filters?: {
    completed?: boolean;
    priority?: 'low' | 'medium' | 'high';
    limit?: number;
  }): Promise<Task[]> {
    return this.withRetry(async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.completed !== undefined) {
        query = query.eq('completed', filters.completed);
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        priority: task.priority as 'low' | 'medium' | 'high',
        dueDate: task.due_date || undefined,
        completed: task.completed,
        createdAt: task.created_at,
        actionType: task.action_type as Task['actionType'],
        scheduledFor: task.scheduled_for || undefined,
        contactInfo: task.contact_info || undefined,
      }));
    }, 'Get tasks');
  }

  async getTaskCount(completed: boolean = false): Promise<number> {
    return this.withRetry(async () => {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('completed', completed);

      if (error) throw error;
      return count || 0;
    }, 'Get task count');
  }

  async createScheduledAction(actionData: Omit<ScheduledAction, 'id' | 'created_at' | 'updated_at'>): Promise<ScheduledAction> {
    return this.withRetry(async () => {
      const { data, error } = await supabase
        .from('scheduled_actions')
        .insert([{
          task_id: actionData.task_id,
          action_type: actionData.action_type,
          scheduled_for: actionData.scheduled_for,
          contact_info: sanitizeContactInfo(actionData.contact_info),
          notification_settings: actionData.notification_settings,
          status: actionData.status,
        }])
        .select(`
          *,
          tasks (
            id,
            title,
            description
          )
        `)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        task_id: data.task_id,
        action_type: data.action_type as ScheduledAction['action_type'],
        scheduled_for: data.scheduled_for,
        contact_info: data.contact_info || undefined,
        notification_settings: data.notification_settings,
        status: data.status as ScheduledAction['status'],
        created_at: data.created_at,
        updated_at: data.updated_at,
        tasks: data.tasks,
      };
    }, 'Create scheduled action');
  }

  async getScheduledActions(status?: 'pending' | 'completed' | 'failed'): Promise<ScheduledAction[]> {
    return this.withRetry(async () => {
      let query = supabase
        .from('scheduled_actions')
        .select(`
          *,
          tasks (
            id,
            title,
            description
          )
        `)
        .order('scheduled_for', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(action => ({
        id: action.id,
        task_id: action.task_id,
        action_type: action.action_type as ScheduledAction['action_type'],
        scheduled_for: action.scheduled_for,
        contact_info: action.contact_info || undefined,
        notification_settings: action.notification_settings,
        status: action.status as ScheduledAction['status'],
        created_at: action.created_at,
        updated_at: action.updated_at,
        tasks: action.tasks,
      }));
    }, 'Get scheduled actions');
  }

  // Subscription management
  createTaskSubscription(callback: (payload: any) => void) {
    const channel = supabase
      .channel(`tasks-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        callback
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }

  createScheduledActionSubscription(callback: (payload: any) => void) {
    const channel = supabase
      .channel(`scheduled-actions-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_actions'
        },
        callback
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
}

export const databaseService = new DatabaseService();