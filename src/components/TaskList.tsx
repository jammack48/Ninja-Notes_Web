
import React from 'react';
import { ArrowLeft, Mic, Calendar, Trash2, CheckCircle2, Circle } from 'lucide-react';
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
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <Card className={`transition-all duration-300 border-0 shadow-sm hover:shadow-md bg-white/80 backdrop-blur-sm ${
      task.completed ? 'opacity-60' : ''
    }`}>
      <CardContent className="p-5">
        <div className="flex items-start space-x-4">
          <div className="mt-1">
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => onToggleTask(task.id)}
              className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-lg leading-tight ${
              task.completed ? 'line-through text-slate-500' : 'text-slate-900'
            }`}>
              {task.title}
            </h3>
            {task.description && (
              <p className={`text-sm mt-2 leading-relaxed ${
                task.completed ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {task.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-3">
                <Badge 
                  variant="outline" 
                  className={`text-xs font-medium ${getPriorityColor(task.priority)}`}
                >
                  {task.priority}
                </Badge>
                {task.dueDate && (
                  <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-full">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteTask(task.id)}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 h-auto"
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
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="flex justify-between items-center p-6 pt-16 bg-white/70 backdrop-blur-sm border-b border-slate-200/50">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onSwitchToMic}
          className="flex items-center gap-2 bg-white/70 backdrop-blur-sm border-slate-200 hover:bg-white/90"
        >
          <ArrowLeft className="w-4 h-4" />
          <Mic className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Your Tasks</h1>
          <p className="text-slate-600 font-medium mt-1">
            {incompleteTasks.length} pending {incompleteTasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
        <div className="w-20"></div> {/* Spacer for center alignment */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <Mic className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-3">No tasks yet</h3>
            <p className="text-slate-500 mb-6 leading-relaxed">
              Start capturing your thoughts with the microphone to create your first task
            </p>
            <Button 
              onClick={onSwitchToMic} 
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Go to Mic
            </Button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Incomplete Tasks */}
            {incompleteTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Circle className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-lg font-semibold text-slate-800">
                    To Do ({incompleteTasks.length})
                  </h2>
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
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-lg font-semibold text-slate-800">
                    Completed ({completedTasks.length})
                  </h2>
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
      <div className="p-4 bg-white/70 backdrop-blur-sm border-t border-slate-200/50">
        <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-2">
          <ArrowLeft className="w-3 h-3" />
          Swipe left to capture more thoughts
        </p>
      </div>
    </div>
  );
};
