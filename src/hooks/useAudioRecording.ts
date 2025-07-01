import { useState, useRef, useCallback, useEffect } from 'react';
import { APP_CONFIG } from '@/config/app.config';

interface UseAudioRecordingOptions {
  onRecordingComplete?: (audioData: string) => void;
  onError?: (error: Error) => void;
  maxDuration?: number;
}

export const useAudioRecording = (options: UseAudioRecordingOptions = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioData, setAudioData] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { 
    onRecordingComplete, 
    onError, 
    maxDuration = APP_CONFIG.MAX_RECORDING_DURATION 
  } = options;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    mediaRecorderRef.current = null;
    setRecordingTime(0);
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      // Check if already recording
      if (isRecording) {
        console.warn('Recording already in progress');
        return false;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Set up event handlers
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
          onRecordingComplete?.(base64Data);
        };
        
        reader.onerror = () => {
          const error = new Error('Failed to process audio data');
          onError?.(error);
        };
        
        reader.readAsDataURL(audioBlob);
        cleanup();
      };

      mediaRecorder.onerror = (event) => {
        const error = new Error(`MediaRecorder error: ${event.error}`);
        onError?.(error);
        cleanup();
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Auto-stop after max duration
      timeoutRef.current = setTimeout(() => {
        stopRecording();
      }, maxDuration);

      return true;
    } catch (error) {
      const recordingError = error instanceof Error 
        ? error 
        : new Error('Failed to start recording');
      
      onError?.(recordingError);
      cleanup();
      return false;
    }
  }, [isRecording, maxDuration, onRecordingComplete, onError, cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    recordingTime,
    audioData,
    startRecording,
    stopRecording,
    formatTime: formatTime(recordingTime),
    cleanup,
  };
};