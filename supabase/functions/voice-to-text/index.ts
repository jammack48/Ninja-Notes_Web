
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced timing utility
class ProcessingTimer {
  private startTime: number;
  private stages: { [key: string]: number } = {};

  constructor() {
    this.startTime = Date.now();
  }

  markStage(stageName: string) {
    const now = Date.now();
    this.stages[stageName] = now - this.startTime;
    console.log(`⏱️ Stage "${stageName}" completed in ${this.stages[stageName]}ms`);
    return this.stages[stageName];
  }

  getTotalTime() {
    return Date.now() - this.startTime;
  }

  getAllTimings() {
    return {
      ...this.stages,
      totalTime: this.getTotalTime()
    };
  }
}

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  console.log(`🔄 Processing base64 string of length: ${base64String.length}`);
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  console.log(`✅ Processed audio binary of size: ${result.length} bytes`);
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('🎤 Voice-to-text function called');
  const timer = new ProcessingTimer();

  try {
    const { audio } = await req.json();
    timer.markStage('request_parsed');
    
    if (!audio) {
      console.error('❌ No audio data provided in request');
      throw new Error('No audio data provided');
    }

    console.log(`📊 Audio data received, length: ${audio.length}`);

    // Check if OpenAI API key is available
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('❌ OPENAI_API_KEY environment variable not set');
      throw new Error('OpenAI API key not configured. Please check your Supabase Edge Function secrets.');
    }

    console.log('🔑 OpenAI API key found, starting processing...');

    // STAGE 1: WHISPER TRANSCRIPTION
    console.log('🎯 STAGE 1: Starting Whisper transcription...');
    const binaryAudio = processBase64Chunks(audio);
    timer.markStage('audio_processed');
    
    // Prepare form data for OpenAI Whisper
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    timer.markStage('formdata_prepared');

    console.log('📡 Sending request to OpenAI Whisper API...');

    // Send to OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    const whisperTime = timer.markStage('whisper_completed');
    console.log(`📈 Whisper API response status: ${whisperResponse.status}`);

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('❌ Whisper API error response:', errorText);
      throw new Error(`Whisper API error (${whisperResponse.status}): ${errorText}`);
    }

    const whisperResult = await whisperResponse.json();
    const rawTranscription = whisperResult.text;

    console.log('✅ Whisper transcription successful:', rawTranscription);

    // STAGE 2: CHATGPT CLEANUP & ANALYSIS
    console.log('🎯 STAGE 2: Starting ChatGPT cleanup and analysis...');
    
    const chatgptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert text processor that cleans up speech-to-text transcriptions and extracts actionable tasks. 

Your job is to:
1. Fix grammar, spelling, and punctuation errors
2. Improve sentence structure and clarity
3. Maintain the original meaning and intent
4. Extract clear, actionable tasks if present
5. Return a JSON response with both cleaned text and extracted tasks

Response format:
{
  "cleanedText": "The improved, grammatically correct version of the text",
  "extractedTasks": [
    {
      "title": "Task title",
      "description": "Task description",
      "priority": "low|medium|high"
    }
  ],
  "improvements": "Brief description of what was improved"
}`
          },
          {
            role: 'user',
            content: `Please clean up and analyze this speech-to-text transcription: "${rawTranscription}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    const chatgptTime = timer.markStage('chatgpt_completed');
    console.log(`📈 ChatGPT API response status: ${chatgptResponse.status}`);

    if (!chatgptResponse.ok) {
      const errorText = await chatgptResponse.text();
      console.error('❌ ChatGPT API error response:', errorText);
      // Fallback to raw transcription if ChatGPT fails
      console.log('⚠️ Falling back to raw Whisper transcription');
      const fallbackResult = {
        cleanedText: rawTranscription,
        extractedTasks: [],
        improvements: "ChatGPT processing failed, using raw transcription"
      };
      timer.markStage('fallback_applied');
    } else {
      const chatgptResult = await chatgptResponse.json();
      let analysisResult;
      
      try {
        analysisResult = JSON.parse(chatgptResult.choices[0].message.content);
        console.log('✅ ChatGPT analysis successful:', analysisResult);
      } catch (parseError) {
        console.error('❌ Failed to parse ChatGPT response, using fallback');
        analysisResult = {
          cleanedText: rawTranscription,
          extractedTasks: [],
          improvements: "Failed to parse AI analysis, using raw transcription"
        };
      }
      timer.markStage('analysis_parsed');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase configuration missing');
      throw new Error('Supabase configuration not found');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save transcription to database
    console.log('💾 Saving transcription to database...');
    const { data, error } = await supabase
      .from('transcriptions')
      .insert([{
        text: analysisResult?.cleanedText || rawTranscription,
        audio_length: binaryAudio.length,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    const dbTime = timer.markStage('database_saved');

    if (error) {
      console.error('❌ Database error:', error);
      console.log('⚠️ Continuing despite database error...');
    } else {
      console.log('✅ Transcription saved to database:', data);
    }

    const totalTime = timer.getTotalTime();
    const timings = timer.getAllTimings();

    console.log('📊 PROCESSING COMPLETE - Performance Summary:');
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Whisper Time: ${whisperTime}ms`);
    console.log(`   ChatGPT Time: ${chatgptTime}ms`);
    console.log(`   Database Time: ${dbTime}ms`);

    return new Response(
      JSON.stringify({ 
        rawTranscription,
        cleanedText: analysisResult?.cleanedText || rawTranscription,
        extractedTasks: analysisResult?.extractedTasks || [],
        improvements: analysisResult?.improvements || "No improvements applied",
        id: data?.id || null,
        success: true,
        timings,
        processingStages: {
          whisperTime: `${whisperTime}ms`,
          chatgptTime: `${chatgptTime}ms`,
          databaseTime: `${dbTime}ms`,
          totalTime: `${totalTime}ms`
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    const errorTime = timer.getTotalTime();
    console.error(`❌ Error in voice-to-text function after ${errorTime}ms:`, error);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.message.includes('API key')) {
      errorMessage = 'OpenAI API key not configured. Please check your Supabase Edge Function secrets.';
    } else if (error.message.includes('OpenAI service')) {
      errorMessage = 'OpenAI service error. Please try again later.';
    } else if (error.message.includes('No audio data')) {
      errorMessage = 'No audio data received. Please try recording again.';
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
        details: error.message,
        timings: timer.getAllTimings(),
        processingTime: `${errorTime}ms`
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});
