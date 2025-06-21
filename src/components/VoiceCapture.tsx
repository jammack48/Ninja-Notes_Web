import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Copy, RotateCcw, CheckCircle, Send, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/Task';
import { nativeNotificationService } from '@/services/NativeNotificationService';

interface VoiceCaptureProps {
  onTaskCreated: (task: Task) => void;
  onSwitchToTasks: () => void;
  taskCount: number;
}

interface TranscriptionResult {
  rawTranscription: string;
  cleanedText: string;
  extractedTasks: Array<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    actionType: 'reminder' | 'call' | 'text' | 'email' | 'note';
    scheduledFor: string | null;
    contactInfo: {
      name?: string;
      phone?: string;
      email?: string;
    };
  }>;
  improvements: string;
  confidence: 'low' | 'medium' | 'high';
  potentialErrors: string[];
  timings: Record<string, number>;
}

// Helper function to safely convert Json to contact info
const convertToContactInfo = (contactInfo: any): { name?: string; phone?: string; email?: string; } | undefined => {
  if (!contactInfo || typeof contactInfo !== 'object') {
    return undefined;
  }
  
  return {
    name: typeof contactInfo.name === 'string' ? contactInfo.name : undefined,
    phone: typeof contactInfo.phone === 'string' ? contactInfo.phone : undefined,
    email: typeof contactInfo.email === 'string' ? contactInfo.email : undefined,
  };
};

export const VoiceCapture: React.FC<VoiceCaptureProps> = ({
  onTaskCreated,
  onSwitchToTasks,
  taskCount
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<string>('');
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      console.log('Attempting to start recording...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          setAudioData(base64Data);
          processAudio(base64Data);
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setShowTranscript(false);
      setTranscriptionResult(null);
      
      toast({
        title: "Recording Started",
        description: "Microphone is active. Speak clearly for best results.",
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
      
      // Handle specific permission and device errors
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Microphone Permission Denied",
          description: "Please allow microphone access in your device settings and try again.",
          variant: "destructive"
        });
      } else if (error.name === 'NotFoundError') {
        toast({
          title: "No Microphone Found",
          description: "No microphone device was detected. Please check your device.",
          variant: "destructive"
        });
      } else if (error.name === 'NotSupportedError') {
        toast({
          title: "Feature Not Supported",
          description: "Audio recording is not supported on this device.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Recording Error",
          description: "Could not start recording. Please check your microphone and permissions.",
          variant: "destructive"
        });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (base64Audio: string) => {
    setIsProcessing(true);
    setProcessingStage('Analyzing audio...');
    
    try {
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to process audio');
      }

      console.log('Voice-to-text result:', data);
      setTranscriptionResult(data);
      setShowTranscript(true);
      
      // Only auto-save tasks that have high confidence AND clear actionable tasks
      if (data.confidence === 'high' && data.extractedTasks?.length > 0) {
        // Check if any task has scheduling or clear action type
        const hasActionableTasks = data.extractedTasks.some(task => 
          task.scheduledFor || ['call', 'text', 'email', 'reminder'].includes(task.actionType)
        );
        
        if (hasActionableTasks) {
          await saveAllTasks(data.extractedTasks);
          toast({
            title: "Tasks Auto-Saved",
            description: `${data.extractedTasks.length} task(s) processed and saved automatically!`,
          });
          setShowTranscript(false);
          setTranscriptionResult(null);
        }
      }
      
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process audio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const saveAllTasks = async (tasks: TranscriptionResult['extractedTasks']) => {
    for (const taskData of tasks) {
      await saveTask(taskData);
    }
  };

  const saveTask = async (taskData: TranscriptionResult['extractedTasks'][0]) => {
    try {
      console.log('🔄 Saving task with data:', taskData);
      
      // First, create the task in the database
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          action_type: taskData.actionType,
          contact_info: taskData.contactInfo,
          scheduled_for: taskData.scheduledFor,
          completed: false
        }])
        .select()
        .single();

      if (taskError) {
        console.error('❌ Error creating task:', taskError);
        throw taskError;
      }

      console.log('✅ Task created successfully:', task);

      // For scheduled tasks, create native notifications
      if (taskData.scheduledFor && task) {
        const scheduledDate = new Date(taskData.scheduledFor);
        const now = new Date();
        
        console.log(`📅 Scheduling notification for: ${scheduledDate.toISOString()}`);
        console.log(`⏰ Current time: ${now.toISOString()}`);
        console.log(`⌛ Time until notification: ${Math.round((scheduledDate.getTime() - now.getTime()) / 1000)} seconds`);
        
        // Only schedule if the time is in the future
        if (scheduledDate > now) {
          // Schedule native notification for immediate device notification
          if (nativeNotificationService.isNativePlatform()) {
            const notificationId = nativeNotificationService.getNextNotificationId();
            
            console.log(`📱 Scheduling native notification with ID: ${notificationId}`);
            const notificationScheduled = await nativeNotificationService.scheduleNotification({
              id: notificationId,
              title: `${taskData.actionType === 'reminder' ? '⏰ Reminder' : '📱 Action'}: ${taskData.title}`,
              body: taskData.description || `Time for your ${taskData.actionType}!`,
              scheduledAt: scheduledDate,
              actionId: task.id
            });

            if (notificationScheduled) {
              console.log('✅ Native notification scheduled successfully for:', scheduledDate);
            } else {
              console.error('❌ Failed to schedule native notification');
            }
          }

          // Also create scheduled action in database as backup
          console.log('📝 Creating scheduled action with task_id:', task.id);
          
          const { data: scheduledAction, error: scheduledError } = await supabase
            .from('scheduled_actions')
            .insert([{
              task_id: task.id,
              action_type: taskData.actionType,
              scheduled_for: taskData.scheduledFor,
              contact_info: taskData.contactInfo || null,
              notification_settings: {
                web_push: !nativeNotificationService.isNativePlatform(),
                email: false,
                sms: false
              },
              status: 'pending'
            }])
            .select()
            .single();

          if (scheduledError) {
            console.error('❌ Error creating scheduled action:', scheduledError);
          } else {
            console.log('✅ Scheduled action created successfully:', scheduledAction);
          }
        } else {
          console.log('⚠️ Scheduled time is in the past, not scheduling notification');
        }
      } else if (!taskData.scheduledFor) {
        console.log('ℹ️ No scheduledFor date - notification not scheduled');
      }

      // Create Task object for the UI with proper type conversion
      const newTask: Task = {
        id: task.id,
        title: task.title,
        description: task.description || '',
        priority: task.priority as 'low' | 'medium' | 'high',
        dueDate: task.due_date || undefined,
        completed: task.completed,
        createdAt: task.created_at,
        actionType: task.action_type as 'reminder' | 'call' | 'text' | 'email' | 'note',
        scheduledFor: task.scheduled_for || undefined,
        contactInfo: convertToContactInfo(task.contact_info),
      };

      // Only call onTaskCreated for non-scheduled tasks or to update the UI
      onTaskCreated(newTask);

      return newTask;
    } catch (error) {
      console.error('❌ Error saving task:', error);
      toast({
        title: "Save Error",
        description: "Failed to save task. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const playAudio = () => {
    if (audioData && !isPlaying) {
      const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], {
        type: 'audio/webm'
      });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play();
    }
  };

  const copyToClipboard = () => {
    if (transcriptionResult?.cleanedText) {
      navigator.clipboard.writeText(transcriptionResult.cleanedText);
      toast({
        title: "Copied",
        description: "Text copied to clipboard",
      });
    }
  };

  const handleRetry = () => {
    setShowTranscript(false);
    setTranscriptionResult(null);
    setAudioData('');
    startRecording();
  };

  const handleAcceptTasks = async () => {
    if (transcriptionResult?.extractedTasks?.length > 0) {
      await saveAllTasks(transcriptionResult.extractedTasks);
      toast({
        title: "Tasks Accepted",
        description: `${transcriptionResult.extractedTasks.length} task(s) saved successfully!`,
      });
      setShowTranscript(false);
      setTranscriptionResult(null);
    }
  };

  const handleCustomEdit = () => {
    toast({
      title: "Custom Edit",
      description: "Custom editing feature coming soon!",
    });
  };

  // Add test notification function
  const testPopupNotification = async () => {
    console.log('🧪 Testing popup notification...');
    const success = await nativeNotificationService.scheduleTestNotification();
    
    if (success) {
      toast({
        title: "Test Scheduled",
        description: "Popup notification will appear in 10 seconds!",
      });
    } else {
      toast({
        title: "Test Failed",
        description: "Could not schedule test notification",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 space-y-6">
      {/* Floating Task Count */}
      {taskCount > 0 && (
        <div className="fixed top-20 right-4 z-40">
          <Button
            variant="outline"
            size="sm"
            onClick={onSwitchToTasks}
            className="bg-cyan-500/20 border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/30 backdrop-blur-sm"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {taskCount} Tasks
          </Button>
        </div>
      )}

      {/* Test Notification Button - Fixed position */}
      <div className="fixed top-20 left-4 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={testPopupNotification}
          disabled={isProcessing}
          className="bg-orange-500/20 border-orange-400/40 text-orange-100 hover:bg-orange-500/30 backdrop-blur-sm"
        >
          <Bell className="w-4 h-4 mr-2" />
          Test Popup
        </Button>
      </div>

      {/* Main Recording Interface */}
      <div className="text-center space-y-4">
        <div className="relative">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-32 h-32 rounded-full transition-all duration-300 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/40' 
                : 'bg-gradient-to-br from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-lg shadow-cyan-500/40'
            }`}
          >
            {isRecording ? (
              <MicOff className="w-12 h-12 text-white" />
            ) : (
              <Mic className="w-12 h-12 text-white" />
            )}
          </Button>
          
          {isRecording && (
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
              <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/40">
                {formatTime(recordingTime)}
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">
            {isRecording ? 'Recording...' : 'Tap to Record'}
          </h2>
          <p className="text-slate-300">
            {isRecording 
              ? 'Speak your task or reminder clearly' 
              : 'Press and hold to capture your voice command'
            }
          </p>
          <p className="text-orange-300 text-sm">
            Use "Test Popup" button to verify notifications work
          </p>
        </div>

        {isProcessing && (
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="text-slate-300 text-sm">{processingStage}</p>
          </div>
        )}
      </div>

      {/* Transcript Popup */}
      {showTranscript && transcriptionResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="bg-slate-800/90 backdrop-blur-xl border border-cyan-500/30 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Voice Command Result</h3>
                  <Badge 
                    variant="outline" 
                    className={`${
                      transcriptionResult.confidence === 'high' 
                        ? 'bg-green-500/20 text-green-300 border-green-500/40'
                        : transcriptionResult.confidence === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                        : 'bg-red-500/20 text-red-300 border-red-500/40'
                    }`}
                  >
                    {transcriptionResult.confidence} confidence
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">What you said:</p>
                    <p className="text-white bg-slate-700/50 p-3 rounded-lg">
                      "{transcriptionResult.cleanedText}"
                    </p>
                  </div>

                  {transcriptionResult.extractedTasks?.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Detected Tasks:</p>
                      <div className="space-y-2">
                        {transcriptionResult.extractedTasks.map((task, index) => (
                          <div key={index} className="bg-slate-700/50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {task.actionType}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {task.priority}
                              </Badge>
                            </div>
                            <p className="text-white font-medium">{task.title}</p>
                            <p className="text-slate-300 text-sm">{task.description}</p>
                            {task.scheduledFor && (
                              <p className="text-cyan-400 text-xs mt-1">
                                ⏰ Scheduled: {new Date(task.scheduledFor).toLocaleString()}
                              </p>
                            )}
                            {task.contactInfo?.name && (
                              <p className="text-purple-400 text-xs">
                                👤 Contact: {task.contactInfo.name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {transcriptionResult.potentialErrors?.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <p className="text-sm text-amber-400">Potential Issues:</p>
                      </div>
                      <ul className="text-xs text-amber-300 list-disc list-inside">
                        {transcriptionResult.potentialErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Action Buttons - Improved Layout */}
                <div className="space-y-3 mt-6">
                  {/* Primary Action - Accept/Save Tasks */}
                  {transcriptionResult.extractedTasks?.length > 0 && (
                    <Button
                      onClick={handleAcceptTasks}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-medium"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept & Save {transcriptionResult.extractedTasks.length} Task{transcriptionResult.extractedTasks.length > 1 ? 's' : ''}
                    </Button>
                  )}
                  
                  {/* Secondary Actions - Grid Layout */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Try Again
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className="bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy Text
                    </Button>
                  </div>

                  {/* Audio Controls */}
                  <div className="flex items-center justify-center pt-2 border-t border-slate-600">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={playAudio}
                      disabled={isPlaying}
                      className="text-slate-300 hover:text-white"
                    >
                      <Volume2 className="w-4 h-4 mr-2" />
                      {isPlaying ? 'Playing...' : 'Replay Audio'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
