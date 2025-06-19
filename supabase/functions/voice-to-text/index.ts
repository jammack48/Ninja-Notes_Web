import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

class ProcessingTimer {
  startTime;
  stages = {};
  constructor() {
    this.startTime = Date.now();
  }
  markStage(stageName) {
    const now = Date.now();
    this.stages[stageName] = now - this.startTime;
    console.log(`⏱️ Stage "${stageName}" completed in ${this.stages[stageName]}ms`);
    return this.stages[stageName];
  }
  getTotalTime() {
    return Date.now() - this.startTime;
  }
  getAllTimings() {
    return { ...this.stages, totalTime: this.getTotalTime() };
  }
}

function processBase64Chunks(base64String, chunkSize = 32768) {
  console.log(`🔄 Processing base64 string of length: ${base64String.length}`);
  const chunks = [];
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

    if (!audio) throw new Error('No audio data provided');

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new Error('OpenAI API key not configured.');

    const binaryAudio = processBase64Chunks(audio);
    timer.markStage('audio_processed');

    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    timer.markStage('formdata_prepared');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      body: formData
    });

    const whisperTime = timer.markStage('whisper_completed');
    if (!whisperResponse.ok) throw new Error(await whisperResponse.text());
    const whisperResult = await whisperResponse.json();
    const rawTranscription = whisperResult.text;
    console.log('✅ Whisper transcription successful:', rawTranscription);

    const systemPrompt = `IMPORTANT: Pay close attention to potential transcription errors. Look for:
- Similar-sounding words (e.g. “Neck thirsty” vs “next Thursday”)
- Missing articles, prepositions, or punctuation
- Garbled time expressions (12pm, at 12, etc.)
- Names misheard as common words

Your job is to:
1. Fix grammar, spelling, and obvious transcription errors
2. Improve sentence structure and clarity
3. Maintain the original meaning and intent
4. Extract clear, actionable tasks if present
5. Flag when you suspect transcription errors
6. Assess confidence in the transcription accuracy

Response format (JSON):
{
  "cleanedText": "...",
  "extractedTasks": [{ "title": "", "description": "", "priority": "" }],
  "improvements": "...",
  "confidence": "high|medium|low",
  "potentialErrors": ["..."]
}`;

    const chatgptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please analyze and clean up this speech-to-text transcription: "${rawTranscription}"` }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    const chatgptTime = timer.markStage('chatgpt_completed');

    let analysisResult = {
      cleanedText: rawTranscription,
      extractedTasks: [],
      improvements: "No improvements applied",
      confidence: "medium",
      potentialErrors: []
    };

    if (chatgptResponse.ok) {
      const chatgptResult = await chatgptResponse.json();
      try {
        const parsedResult = JSON.parse(chatgptResult.choices[0].message.content);
        analysisResult = {
          ...parsedResult,
          confidence: parsedResult.confidence || "medium",
          potentialErrors: parsedResult.potentialErrors || []
        };
        console.log('✅ ChatGPT analysis successful:', analysisResult);
      } catch {
        console.error('❌ Failed to parse ChatGPT response, using fallback');
      }
    } else {
      console.warn('⚠️ ChatGPT failed, using raw transcription');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase config missing');

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('transcriptions').insert([
      {
        text: analysisResult.cleanedText,
        audio_length: binaryAudio.length,
        created_at: new Date().toISOString()
      }
    ]).select().single();

    timer.markStage('database_saved');

    if (error) console.warn('⚠️ Supabase insert failed:', error);

    const timings = timer.getAllTimings();
    return new Response(JSON.stringify({
      rawTranscription,
      ...analysisResult,
      id: data?.id || null,
      success: true,
      timings
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    const timings = timer.getAllTimings();
    console.error('❌ Error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timings
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
