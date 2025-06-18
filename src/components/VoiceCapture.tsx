
import React, { useState, useRef } from 'react';
import { Mic, MicOff, ArrowRight, List, Sparkles, Zap, Play, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/types/Task';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface VoiceCaptureProps {
  onTaskCreated: (task: Task) => void;
  onSwitchToTasks: () => void;
  taskCount: number;
}

export const VoiceCapture: React.FC<VoiceCaptureProps> = ({
  onTaskCreated,
  onSwitchToTasks,
  taskCount
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript('');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const simulateVoiceInput = () => {
    const demoMessage = "Call Ryan tomorrow and buy paint for bedroom";
    setTranscript(demoMessage);
    toast({
      title: "Demo Message Simulated",
      description: "Voice input simulated for prototyping purposes",
    });
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert audio blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Call the voice-to-text edge function
        const { data, error } = await supabase.functions.invoke('voice-to-text', {
          body: { audio: base64Audio }
        });

        if (error) {
          throw error;
        }

        if (data?.text) {
          setTranscript(data.text);
          toast({
            title: "Transcription Complete",
            description: "Your voice has been converted to text successfully!",
          });
        } else {
          throw new Error('No transcription received');
        }
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Transcription Error",
        description: "Failed to convert speech to text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processTranscript = async () => {
    setIsProcessing(true);
    
    try {
      // Mock AI processing - in a real app, this would call an AI service
      const mockTasks = [
        {
          title: "Call Ryan about meeting",
          description: "Follow up on the meeting discussion",
          priority: 'medium' as const,
          completed: false,
        },
        {
          title: "Buy paint for bedroom",
          description: "Purchase paint for bedroom decoration",
          priority: 'low' as const,
          completed: false,
        }
      ];

      console.log('Saving tasks to Supabase:', mockTasks);

      // Save each task to Supabase
      for (const taskData of mockTasks) {
        const { data, error } = await supabase
          .from('tasks')
          .insert([taskData])
          .select()
          .single();

        if (error) {
          console.error('Error saving task:', error);
          throw error;
        }

        console.log('Task saved successfully:', data);

        // Create the task object with the returned data
        const newTask: Task = {
          id: data.id,
          title: data.title,
          description: data.description,
          priority: data.priority,
          dueDate: data.due_date,
          completed: data.completed,
          createdAt: data.created_at,
        };

        onTaskCreated(newTask);
      }

      toast({
        title: "Tasks saved successfully!",
        description: `${mockTasks.length} tasks have been processed and saved to your database.`,
      });

      setTranscript('');
    } catch (error) {
      console.error('Error processing transcript:', error);
      toast({
        title: "Error saving tasks",
        description: "There was an error saving your tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-indigo-950/90 to-slate-900/90">
      {/* Futuristic background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse" />
      
      {/* Swipe indicators - Both sides */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity duration-300 md:hidden">
        <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
          <ChevronLeft className="w-4 h-4 animate-pulse" />
          <span>Back</span>
        </div>
        <div className="text-[10px] text-slate-400">Swipe</div>
      </div>
      
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity duration-300 md:hidden">
        <div className="flex items-center gap-1 text-cyan-300 text-xs font-medium">
          <span>Tasks</span>
          <ChevronRight className="w-4 h-4 animate-pulse" />
        </div>
        <div className="text-[10px] text-slate-400">Swipe</div>
      </div>
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 pt-16 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
            Task Whisper
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <p className="text-cyan-200/80 font-medium">Capture thoughts instantly</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onSwitchToTasks}
          className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border-cyan-500/30 hover:bg-slate-700/50 text-cyan-100 hover:text-white shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 md:hidden"
        >
          <List className="w-4 h-4" />
          {taskCount > 0 && (
            <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-100 border-cyan-400/30">
              {taskCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-10 relative z-10">
        {/* Microphone and Demo Button Container */}
        <div className="flex items-center gap-8">
          {/* Demo Button (Desktop only) */}
          <div className="hidden md:block">
            <Button
              size="lg"
              onClick={simulateVoiceInput}
              disabled={isProcessing || isRecording}
              className="w-20 h-20 rounded-full transition-all duration-500 shadow-2xl border-2 bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 border-purple-400/50 shadow-purple-500/30 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Play className="w-8 h-8 text-white drop-shadow-lg relative z-10" />
            </Button>
            <p className="text-xs text-purple-300 text-center mt-2 font-medium">Demo</p>
          </div>

          {/* Main Microphone Button */}
          <div className="relative">
            <div className={`absolute -inset-20 rounded-full transition-all duration-500 ${
              isRecording ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 animate-pulse' : ''
            }`}></div>
            <div className={`absolute -inset-12 rounded-full transition-all duration-300 ${
              isRecording ? 'bg-gradient-to-r from-cyan-400/30 to-purple-400/30 animate-ping' : ''
            }`}></div>
            
            <Button
              size="lg"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`w-40 h-40 rounded-full transition-all duration-500 shadow-2xl border-2 relative overflow-hidden ${
                isRecording 
                  ? 'bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 border-red-400/50 shadow-red-500/30' 
                  : 'bg-gradient-to-br from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 border-cyan-400/50 shadow-cyan-500/30'
              } group`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {isRecording ? (
                <MicOff className="w-16 h-16 text-white drop-shadow-lg relative z-10" />
              ) : (
                <Mic className="w-16 h-16 text-white drop-shadow-lg relative z-10" />
              )}
              
              <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
                isRecording ? 'animate-spin' : ''
              }`}>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              </div>
            </Button>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center">
          {isProcessing ? (
            <div className="flex items-center gap-3 text-xl text-cyan-100">
              <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />
              <span className="font-medium bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">
                AI processing voice to text...
              </span>
            </div>
          ) : isRecording ? (
            <div className="space-y-3">
              <p className="text-xl text-red-300 font-semibold flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                <span className="bg-gradient-to-r from-red-200 to-pink-200 bg-clip-text text-transparent">
                  Listening...
                </span>
              </p>
              <p className="text-sm text-slate-300/80">Whisper AI is capturing your voice</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xl text-white font-medium bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">
                Tap to capture your thoughts
              </p>
              <p className="text-sm text-slate-300/80">OpenAI Whisper will transform speech into actionable tasks</p>
              <div className="hidden md:block">
                <p className="text-xs text-purple-300/80">Or use the demo button for quick prototyping</p>
              </div>
            </div>
          )}
        </div>

        {/* Transcript Preview */}
        {transcript && !isProcessing && (
          <Card className="w-full max-w-md shadow-2xl border-0 bg-slate-800/50 backdrop-blur-xl border border-cyan-500/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                <p className="text-slate-200 leading-relaxed italic">"{transcript}"</p>
              </div>
              <div className="flex justify-end">
                <Button 
                  size="sm" 
                  onClick={processTranscript}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 shadow-lg hover:shadow-cyan-500/20 transition-all duration-300"
                >
                  <Sparkles className="w-4 h-4" />
                  Save to Database
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <div className="text-center space-y-4 max-w-md">
          <p className="text-slate-300/90 font-medium">
            Speak naturally: <span className="text-cyan-300">"Call Ryan tomorrow"</span> or <span className="text-purple-300">"Buy groceries this weekend"</span>
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <ArrowRight className="w-3 h-3" />
            <span>Powered by OpenAI Whisper for accurate transcription</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
    </div>
  );
};
