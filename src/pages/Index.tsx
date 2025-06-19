import React, { useState, useEffect } from 'react';
import { VoiceCapture } from '@/components/VoiceCapture';
import { TaskList } from '@/components/TaskList';
import { LockScreen } from '@/components/LockScreen';
import { Task } from '@/types/Task';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, List } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  // Initialize lock screen to show first on published sites
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'mic' | 'tasks'>('mic');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskCount, setActiveTaskCount] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const minSwipeDistance = 50;

  // Fetch active task count from database
  const fetchActiveTaskCount = async () => {
    try {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('completed', false);

      if (error) {
        console.error('Error fetching task count:', error);
        return;
      }

      setActiveTaskCount(count || 0);
    } catch (error) {
      console.error('Error fetching active task count:', error);
    }
  };

  // Set up real-time subscription for task count updates
  useEffect(() => {
    fetchActiveTaskCount();

    // Subscribe to real-time changes for active task count
    const channel = supabase
      .channel('task-count-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          console.log('Task count update received');
          fetchActiveTaskCount(); // Refetch count when tasks change
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up task count subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  const addTask = (task: Task) => {
    console.log('Adding new task:', task);
    setTasks(prev => [task, ...prev]);
    // Count will be updated via real-time subscription
  };

  const toggleTask = (id: string) => {
    console.log('Toggling task:', id);
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    console.log('Deleting task:', id);
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const handleUnlock = () => {
    console.log('Unlocking app');
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

    console.log('Swipe detected:', { distanceX, distanceY, isLeftSwipe, isRightSwipe, isVerticalSwipe });

    // Only handle horizontal swipes
    if (!isVerticalSwipe) {
      if (isLeftSwipe) {
        // Swipe left: mic -> tasks, tasks -> mic (cycles)
        console.log('Swiping left');
        setCurrentScreen(prev => prev === 'mic' ? 'tasks' : 'mic');
      }
      if (isRightSwipe) {
        // Swipe right: tasks -> mic, mic -> tasks (cycles)
        console.log('Swiping right');
        setCurrentScreen(prev => prev === 'tasks' ? 'mic' : 'tasks');
      }
    }
  };

  // Show lock screen if not unlocked
  if (!isUnlocked) {
    console.log('Showing lock screen');
    return <LockScreen onUnlock={handleUnlock} />;
  }

  console.log('App unlocked, showing main interface');

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Futuristic background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      
      {/* Vertical tab indicators on the edges */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 md:hidden">
        <div className="bg-slate-800/60 backdrop-blur-sm border border-cyan-500/30 rounded-r-lg px-2 py-8 flex flex-col items-center gap-2">
          <div className={`w-1 h-8 rounded-full transition-all duration-300 ${currentScreen === 'tasks' ? 'bg-cyan-400' : 'bg-slate-600/50'}`}></div>
          <div className={`w-1 h-8 rounded-full transition-all duration-300 ${currentScreen === 'mic' ? 'bg-cyan-400' : 'bg-slate-600/50'}`}></div>
        </div>
      </div>
      
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 md:hidden">
        <div className="bg-slate-800/60 backdrop-blur-sm border border-cyan-500/30 rounded-l-lg px-2 py-8 flex flex-col items-center gap-2">
          <div className={`w-1 h-8 rounded-full transition-all duration-300 ${currentScreen === 'tasks' ? 'bg-cyan-400' : 'bg-slate-600/50'}`}></div>
          <div className={`w-1 h-8 rounded-full transition-all duration-300 ${currentScreen === 'mic' ? 'bg-cyan-400' : 'bg-slate-600/50'}`}></div>
        </div>
      </div>
      
      {/* Unified Tab Interface for both Mobile and Desktop */}
      <Tabs value={currentScreen} onValueChange={(value) => setCurrentScreen(value as 'mic' | 'tasks')} className="h-screen">
        <div className="bg-slate-800/50 backdrop-blur-xl border-b border-cyan-500/30 p-4 relative z-50">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-slate-800/70 border border-cyan-500/40 shadow-lg">
            <TabsTrigger 
              value="mic" 
              className="data-[state=active]:bg-cyan-500/30 data-[state=active]:text-cyan-100 data-[state=active]:shadow-md text-slate-300 flex items-center gap-2 font-medium transition-all duration-200"
            >
              <Mic className="w-4 h-4" />
              Voice Input
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="data-[state=active]:bg-cyan-500/30 data-[state=active]:text-cyan-100 data-[state=active]:shadow-md text-slate-300 flex items-center gap-2 font-medium transition-all duration-200"
            >
              <List className="w-4 h-4" />
              Messages ({activeTaskCount})
            </TabsTrigger>
          </TabsList>
          
          {/* Task Whisper title below navigation */}
          <div className="text-center mt-4">
            <h1 className="text-2xl font-bold text-white tracking-tight">Task Whisper</h1>
            <div className="w-16 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-400 mx-auto mt-2"></div>
          </div>
        </div>
        
        <TabsContent value="mic" className="h-[calc(100vh-140px)] m-0">
          <VoiceCapture 
            onTaskCreated={addTask}
            onSwitchToTasks={() => setCurrentScreen('tasks')}
            taskCount={activeTaskCount}
          />
        </TabsContent>
        
        <TabsContent value="tasks" className="h-[calc(100vh-140px)] m-0">
          <TaskList 
            tasks={tasks}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onSwitchToMic={() => setCurrentScreen('mic')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
