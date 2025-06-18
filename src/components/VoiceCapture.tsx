
import React, { useState } from 'react';
import { Mic, MicOff, ArrowRight, List, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/types/Task';

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

  const startRecording = () => {
    setIsRecording(true);
    setTranscript('');
    // Mock voice recording - in real app, this would use Web Speech API
    setTimeout(() => {
      setTranscript("Call Ryan later about the meeting and don't forget to buy paint for the bedroom");
    }, 2000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (transcript) {
      processTranscript();
    }
  };

  const processTranscript = () => {
    setIsProcessing(true);
    
    // Mock AI processing - in real app, this would call OpenAI
    setTimeout(() => {
      const mockTasks = [
        {
          id: Date.now().toString(),
          title: "Call Ryan about meeting",
          description: "Follow up on the meeting discussion",
          priority: 'medium' as const,
          completed: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: (Date.now() + 1).toString(),
          title: "Buy paint for bedroom",
          description: "Purchase paint for bedroom decoration",
          priority: 'low' as const,
          completed: false,
          createdAt: new Date().toISOString(),
        }
      ];

      mockTasks.forEach(task => onTaskCreated(task));
      setTranscript('');
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-purple-50/30" />
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 pt-16 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Task Whisper</h1>
          <p className="text-slate-600 font-medium mt-1">Capture your thoughts instantly</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onSwitchToTasks}
          className="flex items-center gap-2 bg-white/70 backdrop-blur-sm border-slate-200 hover:bg-white/90 shadow-sm"
        >
          <List className="w-4 h-4" />
          {taskCount > 0 && (
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">
              {taskCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-10 relative z-10">
        {/* Microphone Button */}
        <div className="relative">
          <Button
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-40 h-40 rounded-full transition-all duration-300 shadow-2xl border-4 ${
              isRecording 
                ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-red-200 shadow-red-500/25' 
                : 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-indigo-200 shadow-indigo-500/25'
            }`}
          >
            {isRecording ? (
              <MicOff className="w-16 h-16 text-white drop-shadow-sm" />
            ) : (
              <Mic className="w-16 h-16 text-white drop-shadow-sm" />
            )}
          </Button>
          
          {isRecording && (
            <>
              <div className="absolute -inset-6 border-4 border-red-300/50 rounded-full animate-ping"></div>
              <div className="absolute -inset-12 border-2 border-red-200/30 rounded-full animate-ping animation-delay-200"></div>
            </>
          )}
        </div>

        {/* Status Text */}
        <div className="text-center">
          {isProcessing ? (
            <div className="flex items-center gap-3 text-xl text-slate-700">
              <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
              <span className="font-medium">Creating your tasks...</span>
            </div>
          ) : isRecording ? (
            <div className="space-y-2">
              <p className="text-xl text-red-600 font-semibold flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                Listening...
              </p>
              <p className="text-sm text-slate-500">Speak naturally, I'll organize your thoughts</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xl text-slate-700 font-medium">
                Tap to capture your thoughts
              </p>
              <p className="text-sm text-slate-500">Your voice will be transformed into actionable tasks</p>
            </div>
          )}
        </div>

        {/* Transcript Preview */}
        {transcript && !isProcessing && (
          <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-slate-700 leading-relaxed italic">"{transcript}"</p>
              </div>
              <div className="flex justify-end">
                <Button 
                  size="sm" 
                  onClick={processTranscript}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Create Tasks
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <div className="text-center space-y-3 max-w-md">
          <p className="text-slate-600 font-medium">
            Try saying: "Call Ryan tomorrow" or "Buy groceries this weekend"
          </p>
          <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <ArrowRight className="w-3 h-3" />
            Swipe right to view your tasks
          </p>
        </div>
      </div>
    </div>
  );
};
