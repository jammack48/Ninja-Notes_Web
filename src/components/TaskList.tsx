import React, { useEffect, useState } from 'react';
import { ArrowLeft, Mic, Calendar, Trash2, CheckCircle2, Circle, Zap, Brain, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Task } from '@/types/Task';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ActionManager } from './ActionManager';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSwitchToMic: () => void;
}

interface CompletedTask {
  id: string;
  original_task_id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  completed_at: string;
  created_at: string;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleTask,
  onDeleteTask,
  onSwitchToMic
}) => {
  const { toast } = useToast();
  const [dbTasks, setDbTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch tasks from Supabase
  const fetchTasks = async () => {
    try {
      console.log('Fetching tasks from Supabase...');
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('Fetched tasks from database:', data);
      
      // Convert database format to our Task interface
      const formattedTasks: Task[] = data.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
        dueDate: task.due_date || undefined,
        completed: task.completed,
        createdAt: task.created_at
      }));

      setDbTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks from database.",
        variant: "destructive"
      });
    }
  };

  // Fetch completed tasks from Supabase
  const fetchCompletedTasks = async () => {
    try {
      console.log('Fetching completed tasks from Supabase...');
      const { data, error } = await supabase
        .from('completed_tasks')
        .select('*')
        .order('completed_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('Fetched completed tasks from database:', data);
      
      // Convert database format to our CompletedTask interface with proper type casting
      const formattedCompletedTasks: CompletedTask[] = (data || []).map(task => ({
        id: task.id,
        original_task_id: task.original_task_id,
        title: task.title,
        description: task.description || undefined,
        priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
        due_date: task.due_date || undefined,
        completed_at: task.completed_at,
        created_at: task.created_at
      }));

      setCompletedTasks(formattedCompletedTasks);
    } catch (error) {
      console.error('Error fetching completed tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load completed tasks from database.",
        variant: "destructive"
      });
    }
  };

  // Set up real-time subscription with better error handling
  useEffect(() => {
    let tasksChannel: any;
    let completedTasksChannel: any;

    const setupSubscriptions = async () => {
      // Initial data fetch
      await Promise.all([fetchTasks(), fetchCompletedTasks()]);
      setLoading(false);

      // Subscribe to real-time changes for tasks table
      tasksChannel = supabase
        .channel('public:tasks')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks'
          },
          (payload) => {
            console.log('Tasks real-time update received:', payload);
            // Force immediate refetch to ensure UI is in sync
            fetchTasks();
          }
        )
        .subscribe((status) => {
          console.log('Tasks subscription status:', status);
        });

      // Subscribe to real-time changes for completed_tasks table
      completedTasksChannel = supabase
        .channel('public:completed_tasks')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'completed_tasks'
          },
          (payload) => {
            console.log('Completed tasks real-time update received:', payload);
            // Force immediate refetch to ensure UI is in sync
            fetchCompletedTasks();
          }
        )
        .subscribe((status) => {
          console.log('Completed tasks subscription status:', status);
        });
    };

    setupSubscriptions();

    return () => {
      console.log('Cleaning up real-time subscriptions');
      if (tasksChannel) {
        supabase.removeChannel(tasksChannel);
      }
      if (completedTasksChannel) {
        supabase.removeChannel(completedTasksChannel);
      }
    };
  }, []);

  // Use database tasks instead of prop tasks
  const allTasks = dbTasks;
  const incompleteTasks = allTasks.filter(task => !task.completed);

  // Get priority color based on task priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'low':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  // Handle toggling a task's completion status
  const handleToggleTask = async (taskId: string) => {
    try {
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;

      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', taskId);

      if (error) {
        throw error;
      }

      console.log('Task toggled successfully');
    } catch (error) {
      console.error('Error toggling task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle completing a task
  const handleCompleteTask = async (taskId: string) => {
    try {
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;

      // First, insert into completed_tasks table
      const { error: insertError } = await supabase
        .from('completed_tasks')
        .insert({
          original_task_id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          due_date: task.dueDate,
          created_at: task.createdAt
        });

      if (insertError) {
        throw insertError;
      }

      // Then, delete from tasks table
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (deleteError) {
        throw deleteError;
      }

      toast({
        title: "Task completed!",
        description: "Task has been marked as complete and moved to completed tasks."
      });

      console.log('Task completed and moved successfully');
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle deleting a task
  const handleDeleteTask = async (taskId: string) => {
    try {
      console.log('Deleting task:', taskId);
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) {
        throw error;
      }
      
      toast({
        title: "Task deleted",
        description: "Task has been permanently deleted."
      });

      console.log('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Task card component
  const TaskCard = ({ task }: { task: Task }) => (
    <Card className={`transition-all duration-500 border-0 shadow-lg hover:shadow-2xl bg-slate-800/40 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-400/40 group ${task.completed ? 'opacity-60' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start space-x-4">
          <div className="mt-1">
            <Checkbox 
              checked={task.completed} 
              onCheckedChange={() => handleToggleTask(task.id)} 
              className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 border-cyan-500/50 text-white" 
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-lg leading-tight transition-all duration-300 ${task.completed ? 'line-through text-slate-400' : 'text-white group-hover:text-cyan-200'}`}>
              {task.title}
            </h3>
            {task.description && (
              <p className={`text-sm mt-2 leading-relaxed transition-all duration-300 ${task.completed ? 'text-slate-500' : 'text-slate-300 group-hover:text-slate-200'}`}>
                {task.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className={`text-xs font-medium transition-all duration-300 ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </Badge>
                {task.dueDate && (
                  <div className="flex items-center text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-full border border-slate-600/30">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCompleteTask(task.id)}
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 p-2 h-auto transition-all duration-300 flex items-center gap-1"
                  title="Mark as complete"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-2 h-auto transition-all duration-300"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Completed task card component
  const CompletedTaskCard = ({ task }: { task: CompletedTask }) => (
    <Card className="transition-all duration-500 border-0 shadow-lg bg-slate-800/20 backdrop-blur-xl border border-emerald-500/20 opacity-60">
      <CardContent className="p-5">
        <div className="flex items-start space-x-4">
          <div className="mt-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight text-slate-400 line-through">
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm mt-2 leading-relaxed text-slate-500">
                {task.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className={`text-xs font-medium transition-all duration-300 ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </Badge>
                <div className="flex items-center text-xs text-slate-500 bg-slate-700/30 px-2 py-1 rounded-full border border-slate-600/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Completed {new Date(task.completed_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render the task list
  if (loading) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-900/90 via-indigo-950/90 to-slate-900/90 relative">
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-slate-300/80">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900/90 via-indigo-950/90 to-slate-900/90 relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent animate-pulse" />
      
      <div className="flex justify-between items-center p-6 pt-16 bg-slate-800/30 backdrop-blur-xl border-b border-cyan-500/20 relative z-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Messages</h1>
          <p className="text-cyan-200/80 font-medium flex items-center justify-center gap-2">
            <Brain className="w-4 h-4" />
            {incompleteTasks.length} active {incompleteTasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {allTasks.length === 0 && completedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <h3 className="text-xl font-semibold text-white mb-3 bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">
              No messages yet
            </h3>
            <p className="text-slate-300/80 mb-6 leading-relaxed max-w-sm">
              Go to Voice Input to start capturing your thoughts
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Scheduled Actions Section */}
            <ActionManager />

            {/* Active Tasks */}
            {incompleteTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-semibold text-white">
                    Active Tasks ({incompleteTasks.length})
                  </h2>
                  <div className="h-px bg-gradient-to-r from-cyan-500/50 to-transparent flex-1"></div>
                </div>
                <div className="space-y-3">
                  {incompleteTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-semibold text-white">
                    Completed ({completedTasks.length})
                  </h2>
                  <div className="h-px bg-gradient-to-r from-emerald-500/50 to-transparent flex-1"></div>
                </div>
                <div className="space-y-3">
                  {completedTasks.map(task => (
                    <CompletedTaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
    </div>
  );
};
