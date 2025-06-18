import React, { useState } from 'react';
import { VoiceCapture } from '@/components/VoiceCapture';
import { TaskList } from '@/components/TaskList';
import { LockScreen } from '@/components/LockScreen';
import { Task } from '@/types/Task';

const Index = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
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

  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  // Show lock screen if not unlocked
  if (!isUnlocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden relative">
      {/* Futuristic background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      
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
