
import React from 'react';
import { ArrowLeft, Mic, Calendar, Trash2, CheckCircle2, Circle, Zap, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Task } from '@/types/Task';

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
  const incompleteTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'low': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <Card className={`transition-all duration-500 border-0 shadow-lg hover:shadow-2xl bg-slate-800/40 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-400/40 group ${
      task.completed ? 'opacity-60' : ''
    }`}>
      <CardContent className="p-5">
        <div className="flex items-start space-x-4">
          <div className="mt-1">
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => onToggleTask(task.id)}
              className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500 border-cyan-500/50 text-white"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-lg leading-tight transition-all duration-300 ${
              task.completed ? 'line-through text-slate-400' : 'text-white group-hover:text-cyan-200'
            }`}>
              {task.title}
            </h3>
            {task.description && (
              <p className={`text-sm mt-2 leading-relaxed transition-all duration-300 ${
                task.completed ? 'text-slate-500' : 'text-slate-300 group-hover:text-slate-200'
              }`}>
                {task.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-3">
                <Badge 
                  variant="outline" 
                  className={`text-xs font-medium transition-all duration-300 ${getPriorityColor(task.priority)}`}
                >
                  {task.priority}
                </Badge>
                {task.dueDate && (
                  <div className="flex items-center text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-full border border-slate-600/30">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteTask(task.id)}
                className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-2 h-auto transition-all duration-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900/90 via-indigo-950/90 to-slate-900/90 relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent animate-pulse" />
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 pt-16 bg-slate-800/30 backdrop-blur-xl border-b border-cyan-500/20 relative z-10">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onSwitchToMic}
          className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border-cyan-500/30 hover:bg-slate-700/50 text-cyan-100 hover:text-white shadow-lg hover:shadow-cyan-500/20 transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <Mic className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Neural Task Network</h1>
          <p className="text-cyan-200/80 font-medium flex items-center justify-center gap-2">
            <Brain className="w-4 h-4" />
            {incompleteTasks.length} active {incompleteTasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
        <div className="w-20"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-6 shadow-2xl border border-cyan-500/30 backdrop-blur-sm">
              <Mic className="w-12 h-12 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3 bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">
              Neural network empty
            </h3>
            <p className="text-slate-300/80 mb-6 leading-relaxed max-w-sm">
              Begin neural task capture by speaking your thoughts into the quantum microphone
            </p>
            <Button 
              onClick={onSwitchToMic} 
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 shadow-lg hover:shadow-cyan-500/20 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Activate Neural Input
            </Button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Incomplete Tasks */}
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
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="p-4 bg-slate-800/30 backdrop-blur-xl border-t border-cyan-500/20">
        <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-2">
          <ArrowLeft className="w-3 h-3" />
          Swipe left to return to neural input mode
        </p>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
    </div>
  );
};
