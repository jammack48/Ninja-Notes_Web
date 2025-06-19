import React, { useState, useRef } from 'react';
import { Mic, MicOff, ArrowRight, List, Sparkles, Zap, Play, ChevronRight, ChevronLeft, X, Check, Bug, Clock, Cpu, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Task } from '@/types/Task';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
interface VoiceCaptureProps {
  onTaskCreated: (task: Task) => void;
  onSwitchToTasks: () => void;
  taskCount: number;
}
interface ProcessingTimings {
  whisperTime?: string;
  chatgptTime?: string;
  databaseTime?: string;
  totalTime?: string;
}
interface TokenUsage {
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCost?: string;
}
interface TranscriptionResult {
  rawTranscription?: string;
  cleanedText?: string;
  extractedTasks?: Array<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  improvements?: string;
  confidence?: 'high' | 'medium' | 'low';
  potentialErrors?: string[];
  timings?: any;
  processingStages?: ProcessingTimings;
  tokenUsage?: TokenUsage;
}
export const VoiceCapture: React.FC<VoiceCaptureProps> = ({
  onTaskCreated,
  onSwitchToTasks,
  taskCount
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showTranscriptPopup, setShowTranscriptPopup] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult>({});
  const [debugMode, setDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<ProcessingTimings>({});
  const [tokenMetrics, setTokenMetrics] = useState<TokenUsage>({});
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null);
  const {
    toast
  } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const processingStartTime = useRef<number>(0);
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugLogs(prev => [...prev.slice(-9), logMessage]);
  };
  const getMimeType = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg;codecs=opus', 'audio/ogg'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        addDebugLog(`Using MIME type: ${type}`);
        return type;
      }
    }
    addDebugLog('No supported MIME type found, using default');
    return '';
  };
  const startRecording = async () => {
    addDebugLog('Starting recording...');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaRecorder not supported on this device');
      }
      addDebugLog('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      addDebugLog('Microphone access granted');
      const mimeType = getMimeType();
      const options = mimeType ? {
        mimeType
      } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = event => {
        addDebugLog(`Audio data available: ${event.data.size} bytes`);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = async () => {
        addDebugLog('Recording stopped, processing audio...');
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType
        });
        addDebugLog(`Audio blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

        // Store the audio blob for potential retries
        setLastAudioBlob(audioBlob);
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => {
          track.stop();
          addDebugLog(`Stopped track: ${track.kind}`);
        });
      };
      mediaRecorder.onerror = event => {
        addDebugLog(`MediaRecorder error: ${event}`);
      };
      mediaRecorder.start(1000);
      setIsRecording(true);
      setTranscript('');
      toast({
        title: "Recording Started",
        description: "Speak now. Press the button again to stop and process."
      });
    } catch (error: any) {
      addDebugLog(`Error starting recording: ${error.message}`);
      console.error('Error starting recording:', error);
      let errorMessage = "Could not access microphone.";
      if (error.name === 'NotAllowedError') {
        errorMessage = "Microphone permission denied. Please allow microphone access and try again.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No microphone found. Please check your device settings.";
      } else if (error.name === 'NotSupportedError') {
        errorMessage = "Audio recording not supported on this device.";
      }
      toast({
        title: "Recording Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };
  const stopRecording = () => {
    addDebugLog('Stopping recording...');
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Processing Recording",
        description: "Converting speech to text and analyzing with AI..."
      });
    }
  };
  const retryTranscription = async (forceAggressiveCorrection = false) => {
    if (!lastAudioBlob) {
      toast({
        title: "No Audio Available",
        description: "Please record again to retry transcription.",
        variant: "destructive"
      });
      return;
    }
    addDebugLog(`Retrying transcription with aggressive correction: ${forceAggressiveCorrection}`);
    await processAudio(lastAudioBlob, forceAggressiveCorrection);
  };
  const testEdgeFunction = async () => {
    addDebugLog('Testing edge function with simulated audio...');
    setIsProcessing(true);
    setProcessingStage('Preparing test audio...');
    setProcessingProgress(10);
    try {
      // Create a minimal valid WAV file (1 second of silence)
      const sampleRate = 44100;
      const numChannels = 1;
      const bitsPerSample = 16;
      const duration = 1;
      const numSamples = sampleRate * duration;
      const arrayBuffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(arrayBuffer);
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
      view.setUint16(32, numChannels * bitsPerSample / 8, true);
      view.setUint16(34, bitsPerSample, true);
      writeString(36, 'data');
      view.setUint32(40, numSamples * 2, true);
      for (let i = 0; i < numSamples; i++) {
        const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1;
        view.setInt16(44 + i * 2, sample * 32767, true);
      }
      const audioBlob = new Blob([arrayBuffer], {
        type: 'audio/wav'
      });
      addDebugLog(`Test audio blob created: ${audioBlob.size} bytes`);
      setProcessingProgress(30);
      await processAudio(audioBlob);
    } catch (error: any) {
      addDebugLog(`Test failed: ${error.message}`);
      toast({
        title: "Test Failed",
        description: `Edge function test failed: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
      setProcessingProgress(0);
    }
  };
  const simulateVoiceInput = () => {
    addDebugLog('Simulating voice input...');
    const demoMessage = "Call Ryan tomorrow and buy paint for bedroom";
    setTranscriptionResult({
      rawTranscription: demoMessage,
      cleanedText: "Call Ryan tomorrow and buy paint for the bedroom.",
      extractedTasks: [{
        title: "Call Ryan",
        description: "Schedule a call with Ryan for tomorrow",
        priority: "medium"
      }, {
        title: "Buy paint for bedroom",
        description: "Purchase paint for bedroom decoration",
        priority: "low"
      }],
      improvements: "Improved grammar and clarity, extracted actionable tasks",
      confidence: "high",
      potentialErrors: []
    });
    setShowTranscriptPopup(true);
    toast({
      title: "Demo Message Simulated",
      description: "Voice input simulated with AI analysis"
    });
  };
  const processAudio = async (audioBlob: Blob, forceAggressiveCorrection = false) => {
    setIsProcessing(true);
    processingStartTime.current = Date.now();
    setProcessingStage('Converting audio to base64...');
    setProcessingProgress(0);
    addDebugLog(`Processing audio blob of size: ${audioBlob.size}, type: ${audioBlob.type}`);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          addDebugLog(`Base64 audio length: ${base64Audio.length}`);
          setProcessingProgress(20);
          setProcessingStage('Stage 1: Whisper transcription...');
          addDebugLog('Calling voice-to-text edge function...');
          const {
            data,
            error
          } = await supabase.functions.invoke('voice-to-text', {
            body: {
              audio: base64Audio,
              forceAggressiveCorrection
            }
          });
          setProcessingProgress(60);
          setProcessingStage('Stage 2: AI analysis and cleanup...');
          addDebugLog(`Edge function response: ${JSON.stringify({
            data,
            error
          })}`);
          if (error) {
            addDebugLog(`Edge function error: ${JSON.stringify(error)}`);
            throw new Error(`Edge function error: ${error.message || JSON.stringify(error)}`);
          }
          setProcessingProgress(90);
          setProcessingStage('Finalizing results...');
          if (data) {
            addDebugLog(`Processing complete: ${JSON.stringify(data)}`);

            // Store performance metrics
            if (data.processingStages) {
              setPerformanceMetrics(data.processingStages);
              addDebugLog(`Performance metrics: ${JSON.stringify(data.processingStages)}`);
            }

            // Store token usage metrics
            if (data.tokenUsage) {
              setTokenMetrics(data.tokenUsage);
              addDebugLog(`Token usage: ${JSON.stringify(data.tokenUsage)}`);
            }

            // Store the complete result
            setTranscriptionResult({
              rawTranscription: data.rawTranscription,
              cleanedText: data.cleanedText,
              extractedTasks: data.extractedTasks || [],
              improvements: data.improvements,
              confidence: data.confidence || 'medium',
              potentialErrors: data.potentialErrors || [],
              timings: data.timings,
              processingStages: data.processingStages,
              tokenUsage: data.tokenUsage
            });
            setProcessingProgress(100);
            setShowTranscriptPopup(true);
            const totalTime = Date.now() - processingStartTime.current;
            addDebugLog(`Total client processing time: ${totalTime}ms`);
            const confidenceEmoji = data.confidence === 'high' ? '✅' : data.confidence === 'low' ? '⚠️' : '📝';
            toast({
              title: `${confidenceEmoji} AI Processing Complete`,
              description: `Speech analyzed (${data.confidence} confidence) in ${data.processingStages?.totalTime || 'unknown time'}. Cost: ${data.tokenUsage?.estimatedCost || 'N/A'}`
            });
          } else {
            addDebugLog(`No data in response: ${JSON.stringify(data)}`);
            throw new Error('No transcription received from the service');
          }
        } catch (innerError: any) {
          addDebugLog(`Error in reader.onloadend: ${innerError.message}`);
          throw innerError;
        }
      };
      reader.onerror = error => {
        addDebugLog(`FileReader error: ${error}`);
        throw new Error('Failed to read audio file');
      };
    } catch (error: any) {
      addDebugLog(`Error processing audio: ${error.message}`);
      console.error('Error processing audio:', error);
      let errorMessage = `Failed to convert speech to text: ${error.message}`;
      if (error.message.includes('API key')) {
        errorMessage = "OpenAI API key not configured. Please check your Supabase Edge Function secrets.";
      } else if (error.message.includes('OpenAI service')) {
        errorMessage = "OpenAI service error. Please try again later.";
      }
      toast({
        title: "Processing Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
      setProcessingProgress(0);
    }
  };
  const handleSaveTranscript = async () => {
    setIsProcessing(true);
    addDebugLog(`Saving transcript and extracted tasks`);
    try {
      const tasksToSave = transcriptionResult.extractedTasks || [];
      if (tasksToSave.length === 0) {
        // Fallback: create a single task from the cleaned text
        tasksToSave.push({
          title: transcriptionResult.cleanedText?.substring(0, 50) + "..." || "Voice input task",
          description: transcriptionResult.cleanedText || transcriptionResult.rawTranscription || "",
          priority: 'medium' as const
        });
      }
      addDebugLog(`Saving ${tasksToSave.length} tasks to Supabase...`);
      for (const taskData of tasksToSave) {
        const {
          data,
          error
        } = await supabase.from('tasks').insert([{
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          completed: false
        }]).select().single();
        if (error) {
          addDebugLog(`Error saving task: ${JSON.stringify(error)}`);
          throw error;
        }
        addDebugLog(`Task saved successfully: ${data.title}`);
        const rawPriority = data.priority;
        if (!['low', 'medium', 'high'].includes(rawPriority)) {
          throw new Error(`Unexpected priority value "${rawPriority}" from database`);
        }
        const newTask: Task = {
          id: data.id,
          title: data.title,
          description: data.description,
          priority: rawPriority as Task['priority'],
          dueDate: data.due_date,
          completed: data.completed,
          createdAt: data.created_at
        };
        onTaskCreated(newTask);
      }
      toast({
        title: "Tasks saved successfully!",
        description: `${tasksToSave.length} tasks extracted and saved. ${transcriptionResult.improvements || ''}`
      });
      setTranscriptionResult({});
      setShowTranscriptPopup(false);
      setTranscript('');
      setPerformanceMetrics({});
      setLastAudioBlob(null);
    } catch (error: any) {
      addDebugLog(`Error processing transcript: ${error.message}`);
      console.error('Error processing transcript:', error);
      toast({
        title: "Error saving tasks",
        description: "There was an error saving your tasks. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  const handleCancelTranscript = () => {
    addDebugLog('Cancelling transcript');
    setTranscriptionResult({});
    setShowTranscriptPopup(false);
    setTranscript('');
    setPerformanceMetrics({});
    setLastAudioBlob(null);
    toast({
      title: "Transcript Cancelled",
      description: "Your transcription has been discarded."
    });
  };
  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  const getConfidenceColor = (confidence?: string) => {
    switch (confidence) {
      case 'high':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-900/20';
      case 'low':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20';
      default:
        return 'text-cyan-400 border-cyan-500/30 bg-cyan-900/20';
    }
  };
  return <div className="h-full flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-indigo-950/90 to-slate-900/90">
      {/* Futuristic background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse" />
      
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity duration-300 md:hidden">
        <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
          <ChevronLeft className="w-4 h-4 animate-pulse" />
          
        </div>
        
      </div>
      
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity duration-300 md:hidden">
        <div className="flex items-center gap-1 text-cyan-300 text-xs font-medium">
          
          <ChevronRight className="w-4 h-4 animate-pulse" />
        </div>
        
      </div>
      
      {/* Header */}
      <div className="flex justify-between items-center p-6 pt-16 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
            Voice Input
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <p className="text-cyan-200/80 font-medium">AI-powered speech processing</p>
          </div>
          {/* Performance metrics display */}
          {Object.keys(performanceMetrics).length > 0 && <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              <span>Whisper: {performanceMetrics.whisperTime}</span>
              <span>ChatGPT: {performanceMetrics.chatgptTime}</span>
              <span>Total: {performanceMetrics.totalTime}</span>
            </div>}
          {/* Token usage metrics display */}
          {tokenMetrics.totalTokens && <div className="flex items-center gap-3 mt-1 text-xs text-emerald-400">
              <span>💰 {tokenMetrics.totalTokens} tokens</span>
              <span>{tokenMetrics.estimatedCost}</span>
            </div>}
        </div>
        
        {/* Debug toggle */}
        <Button variant="outline" size="sm" onClick={() => setDebugMode(!debugMode)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
          <Bug className="w-4 h-4" />
        </Button>
      </div>

      {/* Debug Panel */}
      {debugMode && <div className="mx-6 mb-4 p-4 bg-slate-800/50 backdrop-blur rounded-lg border border-slate-600 relative z-10">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Debug Logs & Performance
            </h3>
            <Button variant="outline" size="sm" onClick={() => setDebugLogs([])} className="text-xs border-slate-600 text-slate-400 hover:bg-slate-700">
              Clear
            </Button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto text-xs text-slate-400 font-mono">
            {debugLogs.length === 0 ? <p>No logs yet...</p> : debugLogs.map((log, index) => <div key={index} className="break-words">{log}</div>)}
          </div>
          {/* Token usage in debug panel */}
          {tokenMetrics.totalTokens && <div className="mt-3 pt-2 border-t border-slate-600 text-xs text-emerald-400">
              <div className="grid grid-cols-2 gap-2">
                <span>Prompt: {tokenMetrics.promptTokens}</span>
                <span>Completion: {tokenMetrics.completionTokens}</span>
                <span>Total: {tokenMetrics.totalTokens}</span>
                <span>Cost: {tokenMetrics.estimatedCost}</span>
              </div>
            </div>}
        </div>}

      {/* Processing Progress */}
      {isProcessing && <div className="mx-6 mb-4 p-4 bg-slate-800/50 backdrop-blur rounded-lg border border-cyan-500/30 relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="text-cyan-200 font-medium">{processingStage}</span>
          </div>
          <Progress value={processingProgress} className="h-2" />
          <div className="text-xs text-slate-400 mt-2">
            {processingProgress}% complete
          </div>
        </div>}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-10 relative z-10">
        {/* Microphone and Demo Button Container */}
        <div className="flex items-center gap-8">
          {/* Test Button (Desktop only) */}
          <div className="hidden md:block">
            <Button size="lg" onClick={testEdgeFunction} disabled={isProcessing || isRecording} className="w-20 h-20 rounded-full transition-all duration-500 shadow-2xl border-2 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-green-400/50 shadow-green-500/30 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Zap className="w-8 h-8 text-white drop-shadow-lg relative z-10" />
            </Button>
            <p className="text-xs text-green-300 text-center mt-2 font-medium">Test API</p>
          </div>

          {/* Demo Button (Desktop only) */}
          <div className="hidden md:block">
            <Button size="lg" onClick={simulateVoiceInput} disabled={isProcessing || isRecording} className="w-20 h-20 rounded-full transition-all duration-500 shadow-2xl border-2 bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 border-purple-400/50 shadow-purple-500/30 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Play className="w-8 h-8 text-white drop-shadow-lg relative z-10" />
            </Button>
            <p className="text-xs text-purple-300 text-center mt-2 font-medium">Demo</p>
          </div>

          {/* Main Microphone Button */}
          <div className="relative">
            <div className={`absolute -inset-20 rounded-full transition-all duration-500 ${isRecording ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 animate-pulse' : ''}`}></div>
            <div className={`absolute -inset-12 rounded-full transition-all duration-300 ${isRecording ? 'bg-gradient-to-r from-cyan-400/30 to-purple-400/30 animate-ping' : ''}`}></div>
            
            <Button size="lg" onClick={handleRecordingToggle} disabled={isProcessing} className={`w-40 h-40 rounded-full transition-all duration-500 shadow-2xl border-2 relative overflow-hidden ${isRecording ? 'bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 border-red-400/50 shadow-red-500/30' : 'bg-gradient-to-br from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 border-cyan-400/50 shadow-cyan-500/30'} group`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {isRecording ? <MicOff className="w-16 h-16 text-white drop-shadow-lg relative z-10" /> : <Mic className="w-16 h-16 text-white drop-shadow-lg relative z-10" />}
              
              <div className={`absolute inset-0 rounded-full transition-all duration-300 ${isRecording ? 'animate-spin' : ''}`}>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              </div>
            </Button>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center">
          {isProcessing ? <div className="flex items-center gap-3 text-xl text-cyan-100">
              <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />
              <span className="font-medium bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">
                {processingStage || 'AI processing...'}
              </span>
            </div> : isRecording ? <div className="space-y-3">
              <p className="text-xl text-red-300 font-semibold flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                <span className="bg-gradient-to-r from-red-200 to-pink-200 bg-clip-text text-transparent">
                  Recording... Press again to stop
                </span>
              </p>
              <p className="text-sm text-slate-300/80">Whisper AI + ChatGPT will process your voice</p>
            </div> : <div className="space-y-3">
              <p className="text-xl text-white font-medium bg-gradient-to-r from-cyan-200 to-purple-200 bg-clip-text text-transparent">
                Tap to start recording
              </p>
              <p className="text-sm text-slate-300/80">Two-stage AI processing: Whisper transcription → ChatGPT cleanup</p>
              <div className="hidden md:block">
                <p className="text-xs text-purple-300/80">Use demo for quick prototyping or test API for debugging</p>
              </div>
            </div>}
        </div>

        {/* Instructions */}
        <div className="text-center space-y-4 max-w-md">
          <p className="text-slate-300/90 font-medium">
            Speak naturally: <span className="text-cyan-300">"Call Ryan tomorrow"</span> or <span className="text-purple-300">"Buy groceries this weekend"</span>
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Enhanced Transcript Popup with Try Again functionality */}
      {showTranscriptPopup && transcriptionResult && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl shadow-2xl border-0 bg-slate-800/90 backdrop-blur-xl border border-cyan-500/30 animate-in fade-in-0 zoom-in-95 duration-300">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-white">AI Processing Complete</h3>
                    {transcriptionResult.processingStages?.totalTime && <Badge variant="outline" className="text-xs">
                        {transcriptionResult.processingStages.totalTime}
                      </Badge>}
                    {transcriptionResult.tokenUsage?.estimatedCost && <Badge variant="outline" className="text-xs text-emerald-400">
                        {transcriptionResult.tokenUsage.estimatedCost}
                      </Badge>}
                    {transcriptionResult.confidence && <Badge className={`text-xs ${getConfidenceColor(transcriptionResult.confidence)}`}>
                        {transcriptionResult.confidence} confidence
                      </Badge>}
                  </div>
                  
                  {/* Potential Errors Warning */}
                  {transcriptionResult.potentialErrors && transcriptionResult.potentialErrors.length > 0 && <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-yellow-300 font-medium">Potential transcription errors detected:</span>
                      </div>
                      <ul className="text-xs text-yellow-200 list-disc list-inside">
                        {transcriptionResult.potentialErrors.map((error, index) => <li key={index}>{error}</li>)}
                      </ul>
                    </div>}
                  
                  {/* Before/After Comparison */}
                  {transcriptionResult.rawTranscription && transcriptionResult.cleanedText && <div className="space-y-4 mb-4">
                      {transcriptionResult.rawTranscription !== transcriptionResult.cleanedText && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-slate-400 mb-2">Original (Whisper):</p>
                            <p className="text-slate-300 text-sm italic bg-slate-700/30 p-3 rounded border border-slate-600/30">
                              "{transcriptionResult.rawTranscription}"
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-emerald-400 mb-2">Cleaned (ChatGPT):</p>
                            <p className="text-emerald-200 text-sm bg-emerald-900/20 p-3 rounded border border-emerald-500/30">
                              "{transcriptionResult.cleanedText}"
                            </p>
                          </div>
                        </div>}
                      
                      {transcriptionResult.rawTranscription === transcriptionResult.cleanedText && <div>
                          <p className="text-xs text-slate-400 mb-2">Transcription:</p>
                          <p className="text-slate-200 bg-slate-700/50 p-3 rounded border border-slate-600/30">
                            "{transcriptionResult.cleanedText}"
                          </p>
                        </div>}
                    </div>}

                  {/* Extracted Tasks */}
                  {transcriptionResult.extractedTasks && transcriptionResult.extractedTasks.length > 0 && <div className="mb-4">
                      <p className="text-xs text-cyan-400 mb-2">Extracted Tasks ({transcriptionResult.extractedTasks.length}):</p>
                      <div className="space-y-2">
                        {transcriptionResult.extractedTasks.map((task, index) => <div key={index} className="bg-cyan-900/20 p-3 rounded border border-cyan-500/30">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-cyan-200 font-medium text-sm">{task.title}</p>
                              <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                                {task.priority}
                              </Badge>
                            </div>
                            <p className="text-slate-300 text-xs">{task.description}</p>
                          </div>)}
                      </div>
                    </div>}

                  {/* Improvements, Performance & Token Usage */}
                  <div className="space-y-2">
                    {transcriptionResult.improvements && <p className="text-xs text-purple-300 bg-purple-900/20 p-2 rounded border border-purple-500/30">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        {transcriptionResult.improvements}
                      </p>}
                    
                    <div className="flex gap-4 text-xs text-slate-400">
                      {transcriptionResult.processingStages && <>
                          <span>Whisper: {transcriptionResult.processingStages.whisperTime}</span>
                          <span>ChatGPT: {transcriptionResult.processingStages.chatgptTime}</span>
                          <span>DB: {transcriptionResult.processingStages.databaseTime}</span>
                        </>}
                      {transcriptionResult.tokenUsage?.totalTokens && <span className="text-emerald-400">
                          {transcriptionResult.tokenUsage.totalTokens} tokens ({transcriptionResult.tokenUsage.estimatedCost})
                        </span>}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  {lastAudioBlob && <>
                      <Button variant="outline" size="sm" onClick={() => retryTranscription(false)} disabled={isProcessing} className="flex items-center gap-2 border-blue-500/30 text-blue-300 hover:bg-blue-500/10 hover:border-blue-400/40">
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => retryTranscription(true)} disabled={isProcessing} className="flex items-center gap-2 border-orange-500/30 text-orange-300 hover:bg-orange-500/10 hover:border-orange-400/40">
                        <Zap className="w-4 h-4" />
                        Force Fix
                      </Button>
                    </>}
                </div>
                
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" onClick={handleCancelTranscript} disabled={isProcessing} className="flex items-center gap-2 border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-400/40">
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveTranscript} disabled={isProcessing} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 shadow-lg hover:shadow-emerald-500/20 transition-all duration-300">
                    {isProcessing ? <>
                        <Zap className="w-4 h-4 animate-pulse" />
                        Saving...
                      </> : <>
                        <Check className="w-4 h-4" />
                        Save {transcriptionResult.extractedTasks?.length || 1} Task{transcriptionResult.extractedTasks?.length !== 1 ? 's' : ''}
                      </>}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>}

      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
    </div>;
};