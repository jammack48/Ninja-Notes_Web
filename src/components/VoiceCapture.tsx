import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Copy, RotateCcw, Wrench, CheckCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/Task';
import { useNotifications } from '@/hooks/useNotifications';
import { Permissions } from '@capacitor/permissions';

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
  const { scheduleNotification, isNativePlatform } = useNotifications();

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

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      // Check current permission status
      const permission = await Permissions.query({ name: 'microphone' });
      
      if (permission.state === 'granted') {
        return true;
      }
      
      if (permission.state === 'denied') {
        toast({
          title: "Microphone Permission Denied",
          description: "Please enable microphone access in your device settings to use voice recording.",
          variant: "destructive"
        });
        return false;
      }
      
      // Request permission if not yet determined
      const result = await Permissions.request({ name: 'microphone' });
      
      if (result.state === 'granted') {
        toast({
          title: "Permission Granted",
          description: "Microphone access enabled. You can now record voice commands.",
        });
        return true;
      } else {
        toast({
          title: "Permission Required",
          description: "Microphone access is required for voice recording. Please grant permission and try again.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      toast({
        title: "Permission Error",
        description: "Failed to request microphone permission. Please check your device settings.",
        variant: "destructive"
      });
      return false;
    }
  };

  const startRecording = async () => {
    try {
      // Request microphone permission first
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    } catch (error) {
      console.error('Error starting recording:', error);
      
      // Provide more specific error messages
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access in your browser or device settings and try again.",
          variant: "destructive"
        });
      } else if (error.name === 'NotFoundError') {
        toast({
          title: "No Microphone Found",
          description: "No microphone device was found. Please check your device and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Recording Error",
          description: "Could not start recording. Please check your microphone permissions and try again.",
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
      
      // Auto-save tasks that have high confidence
      if (data.confidence === 'high' && data.extractedTasks?.length > 0) {
        await saveAllTasks(data.extractedTasks);
        toast({
          title: "Tasks Saved",
          description: `${data.extractedTasks.length} task(s) processed and saved successfully!`,
        });
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
      console.log('Saving task:', taskData);
      
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
        console.error('Error creating task:', taskError);
        throw taskError;
      }

      console.log('Task created successfully:', task);

      // For reminders, handle both native notifications and database scheduling
      if (taskData.actionType === 'reminder' && taskData.scheduledFor && task) {
        const scheduledDate = new Date(taskData.scheduledFor);
        
        // Try to schedule native notification first (for mobile)
        if (isNativePlatform) {
          const notificationScheduled = await scheduleNotification({
            id: parseInt(task.id.replace(/-/g, '').substring(0, 8), 16), // Convert UUID to number
            title: `⏰ ${taskData.title}`,
            body: taskData.description || 'Reminder notification',
            scheduledAt: scheduledDate,
            data: { taskId: task.id, actionType: 'reminder' }
          });

          if (notificationScheduled) {
            toast({
              title: "Native Reminder Set",
              description: `You'll get a phone notification at ${scheduledDate.toLocaleString()}`,
            });
          }
        }

        // Also create scheduled action in database as backup/fallback
        console.log('Creating scheduled action for reminder with task_id:', task.id);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data: scheduledAction, error: scheduledError } = await supabase
          .from('scheduled_actions')
          .insert([{
            task_id: task.id,
            action_type: taskData.actionType,
            scheduled_for: taskData.scheduledFor,
            contact_info: taskData.contactInfo || null,
            notification_settings: {
              web_push: !isNativePlatform, // Only use web push if not native
              email: false,
              sms: false
            },
            status: 'pending'
          }])
          .select()
          .single();

        if (scheduledError) {
          console.error('Error creating scheduled action:', scheduledError);
          if (!isNativePlatform) {
            toast({
              title: "Warning",
              description: "Task created but web reminder scheduling failed.",
              variant: "destructive"
            });
          }
        } else {
          console.log('Scheduled action created successfully:', scheduledAction);
          if (!isNativePlatform) {
            toast({
              title: "Web Reminder Scheduled",
              description: `Reminder set for ${scheduledDate.toLocaleString()}`,
            });
          }
        }
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

      // Only call onTaskCreated for non-reminder tasks or immediate tasks
      if (taskData.actionType !== 'reminder' || !taskData.scheduledFor) {
        onTaskCreated(newTask);
      }

      return newTask;
    } catch (error) {
      console.error('Error saving task:', error);
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

  const handleForceAccept = async () => {
    if (transcriptionResult?.extractedTasks?.length > 0) {
      await saveAllTasks(transcriptionResult.extractedTasks);
      toast({
        title: "Tasks Saved",
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
                  <h3 className="text-lg font-semibold text-white">Transcript Result</h3>
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
                    <p className="text-sm text-slate-400 mb-1">Processed Text:</p>
                    <p className="text-white bg-slate-700/50 p-3 rounded-lg">
                      {transcriptionResult.cleanedText}
                    </p>
                  </div>

                  {transcriptionResult.extractedTasks?.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Extracted Tasks:</p>
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
                                Scheduled: {new Date(task.scheduledFor).toLocaleString()}
                              </p>
                            )}
                            {task.contactInfo?.name && (
                              <p className="text-purple-400 text-xs">
                                Contact: {task.contactInfo.name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons - 2x2 Grid for Mobile */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 text-xs py-2"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Try Again
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleForceAccept}
                    className="bg-green-500/20 border-green-500/40 text-green-300 hover:bg-green-500/30 text-xs py-2"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Force Fix
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCustomEdit}
                    className="bg-blue-500/20 border-blue-500/40 text-blue-300 hover:bg-blue-500/30 text-xs py-2"
                  >
                    <Wrench className="w-3 h-3 mr-1" />
                    Custom Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30 text-xs py-2"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Text
                  </Button>
                </div>

                {/* Audio Controls */}
                <div className="flex items-center justify-center space-x-4 pt-4 border-t border-slate-600">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={playAudio}
                    disabled={isPlaying}
                    className="text-slate-300 hover:text-white"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    {isPlaying ? 'Playing...' : 'Play Audio'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
