
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 overflow-hidden">
      <div className="h-screen relative">
        {/* Swipeable Container */}
        <div 
          className={`flex h-full transition-transform duration-300 ease-out ${
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
