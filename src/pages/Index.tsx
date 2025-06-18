
import React, { useState } from 'react';
import { VoiceCapture } from '@/components/VoiceCapture';
import { TaskList } from '@/components/TaskList';
import { Task } from '@/types/Task';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<'mic' | 'tasks'>('mic');
  const [tasks, setTasks] = useState<Task[]>([]);

  const addTask = (task: Task) => {
    setTasks(prev => [task, ...prev]);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden relative">
      {/* Futuristic background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      
      <div className="h-screen relative">
        {/* Swipeable Container */}
        <div 
          className={`flex h-full transition-transform duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${
            currentScreen === 'mic' ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ width: '200%' }}
        >
          {/* Mic Screen */}
          <div className="w-1/2 h-full">
            <VoiceCapture 
              onTaskCreated={addTask}
              onSwitchToTasks={() => setCurrentScreen('tasks')}
              taskCount={tasks.length}
            />
          </div>
          
          {/* Task List Screen */}
          <div className="w-1/2 h-full">
            <TaskList 
              tasks={tasks}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onSwitchToMic={() => setCurrentScreen('mic')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
