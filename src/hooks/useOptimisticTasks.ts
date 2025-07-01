import { useState, useCallback, useRef } from 'react';
import { Task } from '@/types/Task';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface OptimisticUpdate {
  id: string;
  type: 'create' | 'update' | 'delete';
  originalData?: Task;
  rollback: () => void;
}

export const useOptimisticTasks = (initialTasks: Task[] = []) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isLoading, setIsLoading] = useState(false);
  const pendingUpdatesRef = useRef<Map<string, OptimisticUpdate>>(new Map());
  const { toast } = useToast();

  const rollbackUpdate = useCallback((updateId: string) => {
    const update = pendingUpdatesRef.current.get(updateId);
    if (update) {
      update.rollback();
      pendingUpdatesRef.current.delete(updateId);
    }
  }, []);

  const addOptimisticTask = useCallback(async (newTask: Omit<Task, 'id' | 'createdAt'>) => {
    const optimisticId = `temp-${Date.now()}`;
    const optimisticTask: Task = {
      ...newTask,
      id: optimisticId,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setTasks(prev => [optimisticTask, ...prev]);

    const rollback = () => {
      setTasks(prev => prev.filter(t => t.id !== optimisticId));
    };

    const updateId = `create-${optimisticId}`;
    pendingUpdatesRef.current.set(updateId, {
      id: updateId,
      type: 'create',
      rollback,
    });

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          due_date: newTask.dueDate,
          completed: newTask.completed,
          action_type: newTask.actionType,
          scheduled_for: newTask.scheduledFor,
          contact_info: newTask.contactInfo,
        }])
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic task with real data
      setTasks(prev => prev.map(t => 
        t.id === optimisticId 
          ? { ...optimisticTask, id: data.id, createdAt: data.created_at }
          : t
      ));

      pendingUpdatesRef.current.delete(updateId);
      return data;
    } catch (error) {
      console.error('Failed to create task:', error);
      rollbackUpdate(updateId);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast, rollbackUpdate]);

  const updateOptimisticTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) return;

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    ));

    const rollback = () => {
      setTasks(prev => prev.map(t => 
        t.id === taskId ? originalTask : t
      ));
    };

    const updateId = `update-${taskId}`;
    pendingUpdatesRef.current.set(updateId, {
      id: updateId,
      type: 'update',
      originalData: originalTask,
      rollback,
    });

    try {
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
          contact_info: updates.contactInfo,
        })
        .eq('id', taskId);

      if (error) throw error;

      pendingUpdatesRef.current.delete(updateId);
    } catch (error) {
      console.error('Failed to update task:', error);
      rollbackUpdate(updateId);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [tasks, toast, rollbackUpdate]);

  const deleteOptimisticTask = useCallback(async (taskId: string) => {
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) return;

    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== taskId));

    const rollback = () => {
      setTasks(prev => [...prev, originalTask].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    };

    const updateId = `delete-${taskId}`;
    pendingUpdatesRef.current.set(updateId, {
      id: updateId,
      type: 'delete',
      originalData: originalTask,
      rollback,
    });

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      pendingUpdatesRef.current.delete(updateId);
    } catch (error) {
      console.error('Failed to delete task:', error);
      rollbackUpdate(updateId);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [tasks, toast, rollbackUpdate]);

  return {
    tasks,
    setTasks,
    isLoading,
    addOptimisticTask,
    updateOptimisticTask,
    deleteOptimisticTask,
    hasPendingUpdates: pendingUpdatesRef.current.size > 0,
  };
};