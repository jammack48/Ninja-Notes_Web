
import React, { useState, useEffect } from 'react';
import { VoiceCapture } from '@/components/VoiceCapture';
import { TaskList } from '@/components/TaskList';
import { LockScreen } from '@/components/LockScreen';
import { Task } from '@/types/Task';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, List } from 'lucide-react';

const Index = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'mic' | 'tasks'>('mic');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const minSwipeDistance = 50;

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

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    // Only handle horizontal swipes
    if (!isVerticalSwipe) {
      if (isLeftSwipe && currentScreen === 'mic') {
        setCurrentScreen('tasks');
      }
      if (isRightSwipe && currentScreen === 'tasks') {
        setCurrentScreen('mic');
      }
    }
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
      
      {/* Desktop Tabs */}
      <div className="hidden md:block">
        <Tabs value={currentScreen} onValueChange={(value) => setCurrentScreen(value as 'mic' | 'tasks')} className="h-screen">
          <div className="bg-slate-800/30 backdrop-blur-xl border-b border-cyan-500/20 p-4">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-slate-800/50 border border-cyan-500/30">
              <TabsTrigger 
                value="mic" 
                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100 text-slate-300 flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Voice Input
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100 text-slate-300 flex items-center gap-2"
              >
                <List className="w-4 h-4" />
                Tasks ({tasks.length})
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="mic" className="h-[calc(100vh-80px)] m-0">
            <VoiceCapture 
              onTaskCreated={addTask}
              onSwitchToTasks={() => setCurrentScreen('tasks')}
              taskCount={tasks.length}
            />
          </TabsContent>
          
          <TabsContent value="tasks" className="h-[calc(100vh-80px)] m-0">
            <TaskList 
              tasks={tasks}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onSwitchToMic={() => setCurrentScreen('mic')}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Swipeable Interface */}
      <div 
        className="h-screen relative md:hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
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
