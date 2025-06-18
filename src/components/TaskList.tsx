
import React from 'react';
import { ArrowLeft, Mic, Calendar, Trash2, CheckCircle2, Circle, Zap, Brain, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Task } from '@/types/Task';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
interface TaskListProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSwitchToMic: () => void;
}
export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleTask,
  onDeleteTask,
  onSwitchToMic
}) => {
  const {
    toast
  } = useToast();
  const incompleteTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);
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
  const handleDoneTask = async (taskId: string) => {
    try {
      const {
        error
      } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) {
        throw error;
      }
      onDeleteTask(taskId);
      toast({
        title: "Task completed!",
        description: "Task has been marked as done and removed."
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive"
      });
    }
  };
  const TaskCard = ({
    task
  }: {
    task: Task;
  }) => <Card className={`transition-all duration-500 border-0 shadow-lg hover:shadow-2xl bg-slate-800/40 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-400/40 group ${task.completed ? 'opacity-60' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start space-x-4">
          <div className="mt-1">
            <Checkbox checked={task.completed} onCheckedChange={() => onToggleTask(task.id)} className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 border-cyan-500/50 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-lg leading-tight transition-all duration-300 ${task.completed ? 'line-through text-slate-400' : 'text-white group-hover:text-cyan-200'}`}>
              {task.title}
            </h3>
            {task.description && <p className={`text-sm mt-2 leading-relaxed transition-all duration-300 ${task.completed ? 'text-slate-500' : 'text-slate-300 group-hover:text-slate-200'}`}>
                {task.description}
              </p>}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className={`text-xs font-medium transition-all duration-300 ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </Badge>
                {task.dueDate && <div className="flex items-center text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-full border border-slate-600/30">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>}
              </div>
              <div className="flex items-center gap-2">
                {task.completed && <Button variant="ghost" size="sm" onClick={() => handleDoneTask(task.id)} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 p-2 h-auto transition-all duration-300 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span className="text-xs">Done</span>
                  </Button>}
                <Button variant="ghost" size="sm" onClick={() => onDeleteTask(task.id)} className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-2 h-auto transition-all duration-300">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;
  return <div className="h-full flex flex-col bg-gradient-to-br from-slate-900/90 via-indigo-950/90 to-slate-900/90 relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent animate-pulse" />
      
      {/* Swipe indicators - Updated to match tab style */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity duration-300 md:hidden">
        <div className="flex items-center gap-1 text-cyan-300 text-xs font-medium">
          <ChevronLeft className="w-4 h-4 animate-pulse" />
          <span>Voice Input</span>
        </div>
        <div className="text-[10px] text-slate-400">Swipe</div>
      </div>
      
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity duration-300 md:hidden">
        <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
          <span>Back</span>
          <ChevronRight className="w-4 h-4 animate-pulse" />
        </div>
        <div className="text-[10px] text-slate-400">Swipe</div>
      </div>
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 pt-16 bg-slate-800/30 backdrop-blur-xl border-b border-cyan-500/20 relative z-10">
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Messages</h1>
          <p className="text-cyan-200/80 font-medium flex items-center justify-center gap-2">
            <Brain className="w-4 h-4" />
            {incompleteTasks.length} active {incompleteTasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
        <div className="w-20 md:hidden"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            
            <h3 className="text-xl font-semibold text-white mb-3 bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">
              No messages yet
            </h3>
            <p className="text-slate-300/80 mb-6 leading-relaxed max-w-sm">
              Go to Voice Input to start capturing your thoughts
            </p>
          </div> : <div className="p-6 space-y-6">
            {/* Incomplete Tasks */}
            {incompleteTasks.length > 0 && <div>
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-semibold text-white">
                    Active Tasks ({incompleteTasks.length})
                  </h2>
                  <div className="h-px bg-gradient-to-r from-cyan-500/50 to-transparent flex-1"></div>
                </div>
                <div className="space-y-3">
                  {incompleteTasks.map(task => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && <div className="mt-8">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-semibold text-white">
                    Completed ({completedTasks.length})
                  </h2>
                  <div className="h-px bg-gradient-to-r from-emerald-500/50 to-transparent flex-1"></div>
                </div>
                <div className="space-y-3">
                  {completedTasks.map(task => <TaskCard key={task.id} task={task} />)}
                </div>
              </div>}
          </div>}
      </div>

      {/* Footer hint */}
      <div className="p-4 bg-slate-800/30 backdrop-blur-xl border-t border-cyan-500/20 md:hidden">
        <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-2">
          <ArrowLeft className="w-3 h-3" />
          Swipe left to return to voice input mode
        </p>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
    </div>;
};
