
import React, { useState } from 'react';
import { Mic, MicOff, ArrowRight, List } from 'lucide-react';
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 pt-12">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Task Whisper</h1>
          <p className="text-sm text-gray-600">Speak your thoughts</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onSwitchToTasks}
          className="flex items-center gap-2"
        >
          <List className="w-4 h-4" />
          {taskCount > 0 && <Badge variant="secondary">{taskCount}</Badge>}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
        {/* Microphone Button */}
        <div className="relative">
          <Button
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-32 h-32 rounded-full transition-all duration-300 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-200' 
                : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-200'
            }`}
          >
            {isRecording ? (
              <MicOff className="w-12 h-12 text-white" />
            ) : (
              <Mic className="w-12 h-12 text-white" />
            )}
          </Button>
          
          {isRecording && (
            <div className="absolute -inset-4 border-4 border-red-300 rounded-full animate-ping"></div>
          )}
        </div>

        {/* Status Text */}
        <div className="text-center">
          {isProcessing ? (
            <p className="text-lg text-gray-700 animate-pulse">
              ✨ Creating your tasks...
            </p>
          ) : isRecording ? (
            <p className="text-lg text-red-600 font-medium">
              🎤 Listening...
            </p>
          ) : (
            <p className="text-lg text-gray-600">
              Tap to capture your thoughts
            </p>
          )}
        </div>

        {/* Transcript Preview */}
        {transcript && !isProcessing && (
          <Card className="w-full max-w-md">
            <CardContent className="p-4">
              <p className="text-sm text-gray-700 italic">"{transcript}"</p>
              <div className="flex justify-end mt-3">
                <Button 
                  size="sm" 
                  onClick={processTranscript}
                  className="flex items-center gap-2"
                >
                  Create Tasks <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <div className="text-center space-y-2 max-w-md">
          <p className="text-sm text-gray-500">
            Say things like "Call Ryan later" or "Buy groceries tomorrow"
          </p>
          <p className="text-xs text-gray-400">
            Swipe right to view your tasks →
          </p>
        </div>
      </div>
    </div>
  );
};
