
import React, { useState } from 'react';
import { Mic, MicOff, ArrowRight, List, Sparkles, Zap } from 'lucide-react';
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
    <div className="h-full flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-indigo-950/90 to-slate-900/90">
      {/* Futuristic background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse" />
      
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
          className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border-cyan-500/30 hover:bg-slate-700/50 text-cyan-100 hover:text-white shadow-lg hover:shadow-cyan-500/20 transition-all duration-300"
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
        {/* Microphone Button */}
        <div className="relative">
          {/* Outer glow rings */}
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
            {/* Inner glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {isRecording ? (
              <MicOff className="w-16 h-16 text-white drop-shadow-lg relative z-10" />
            ) : (
              <Mic className="w-16 h-16 text-white drop-shadow-lg relative z-10" />
            )}
            
            {/* Animated border */}
            <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
              isRecording ? 'animate-spin' : ''
            }`}>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            </div>
          </Button>
        </div>

        {/* Status Text */}
        <div className="text-center">
          {isProcessing ? (
            <div className="flex items-center gap-3 text-xl text-cyan-100">
              <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />
              <span className="font-medium bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">
                AI processing your thoughts...
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
              <p className="text-sm text-slate-300/80">Neural networks are capturing your voice</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xl text-white font-medium bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">
                Tap to capture your thoughts
              </p>
              <p className="text-sm text-slate-300/80">Advanced AI will transform speech into actionable tasks</p>
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
                  Process with AI
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <div className="text-center space-y-4 max-w-md">
          <p className="text-slate-300/90 font-medium">
            Try: <span className="text-cyan-300">"Call Ryan tomorrow"</span> or <span className="text-purple-300">"Buy groceries this weekend"</span>
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <ArrowRight className="w-3 h-3" />
            <span>Swipe right to view your neural task network</span>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
    </div>
  );
};
