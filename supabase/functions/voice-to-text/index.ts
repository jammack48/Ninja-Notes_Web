
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

function parseTimeExpression(timeText, baseTime = new Date()) {
  const text = timeText.toLowerCase();
  const now = new Date(baseTime);
  
  // Handle relative time expressions
  if (text.includes('in ')) {
    const minutesMatch = text.match(/in (\d+) minutes?/);
    const hoursMatch = text.match(/in (\d+) hours?/);
    const daysMatch = text.match(/in (\d+) days?/);
    
    if (minutesMatch) {
      const minutes = parseInt(minutesMatch[1]);
      return new Date(now.getTime() + minutes * 60 * 1000);
    }
    if (hoursMatch) {
      const hours = parseInt(hoursMatch[1]);
      return new Date(now.getTime() + hours * 60 * 60 * 1000);
    }
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }
  }
  
  // Handle "tomorrow" expressions
  if (text.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const timeMatch = text.match(/at (\d{1,2}):?(\d{2})?\s*(am|pm)?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2] || '0');
      const period = timeMatch[3];
      
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      
      tomorrow.setHours(hours, minutes, 0, 0);
    } else {
      tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM
    }
    return tomorrow;
  }
  
  // Handle "next week" expressions
  if (text.includes('next week')) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0);
    return nextWeek;
  }
  
  return null;
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

    const systemPrompt = `IMPORTANT: You are an advanced task and action analyzer. Your job is to:

1. Fix grammar, spelling, and obvious transcription errors
2. Identify actionable tasks and their types
3. Extract time expressions and convert them to actionable schedules
4. Identify contact information (names, phone numbers, emails)
5. Determine the appropriate action type and priority

ACTION TYPES:
- "reminder": Time-based alerts (e.g., "remind me to call John")
- "call": Phone call actions (e.g., "call mom", "phone the dentist")
- "text": SMS/messaging actions (e.g., "text Sarah", "message the team")
- "email": Email actions (e.g., "email the report", "send email to boss")
- "note": General notes or tasks without specific actions

TIME EXPRESSIONS to look for:
- "in X minutes/hours/days" (relative time)
- "tomorrow at X time" (next day scheduling)
- "next week" (future scheduling)
- "at X o'clock" (specific time today)

CONTACT EXTRACTION:
- Names of people to contact
- Phone numbers if mentioned
- Email addresses if mentioned

Response format (JSON):
{
  "cleanedText": "...",
  "extractedTasks": [{
    "title": "Brief task title",
    "description": "Full task description", 
    "priority": "low|medium|high",
    "actionType": "reminder|call|text|email|note",
    "scheduledFor": "ISO timestamp if time mentioned, null otherwise",
    "contactInfo": {
      "name": "contact name if mentioned",
      "phone": "phone number if mentioned",
      "email": "email if mentioned"
    }
  }],
  "improvements": "What was improved",
  "confidence": "high|medium|low",
  "potentialErrors": ["..."]
}

EXAMPLES:
- "remind me in ten minutes to call nigel" -> actionType: "reminder", scheduledFor: now+10min, contactInfo: {name: "nigel"}
- "call mom tomorrow at 3pm" -> actionType: "call", scheduledFor: tomorrow 3pm, contactInfo: {name: "mom"}
- "text john about the meeting" -> actionType: "text", contactInfo: {name: "john"}`;

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
          { role: 'user', content: `Please analyze and process this speech-to-text transcription: "${rawTranscription}"` }
        ],
        temperature: 0.3,
        max_tokens: 1500
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
        
        // Process time expressions for each task
        if (parsedResult.extractedTasks && parsedResult.extractedTasks.length > 0) {
          parsedResult.extractedTasks = parsedResult.extractedTasks.map(task => {
            if (task.scheduledFor && typeof task.scheduledFor === 'string') {
              // If ChatGPT provided a time, try to parse it properly
              const parsedTime = parseTimeExpression(rawTranscription);
              if (parsedTime) {
                task.scheduledFor = parsedTime.toISOString();
              }
            } else if (!task.scheduledFor) {
              // Try to extract time from the original text
              const parsedTime = parseTimeExpression(rawTranscription);
              if (parsedTime) {
                task.scheduledFor = parsedTime.toISOString();
              }
            }
            return task;
          });
        }
        
        analysisResult = {
          ...parsedResult,
          confidence: parsedResult.confidence || "medium",
          potentialErrors: parsedResult.potentialErrors || []
        };
        console.log('✅ ChatGPT analysis successful:', analysisResult);
      } catch (parseError) {
        console.error('❌ Failed to parse ChatGPT response:', parseError);
        console.log('Raw ChatGPT response:', chatgptResult.choices[0].message.content);
        
        // Fallback: try to extract basic info manually
        const text = rawTranscription.toLowerCase();
        if (text.includes('remind') || text.includes('call') || text.includes('text') || text.includes('email')) {
          const parsedTime = parseTimeExpression(text);
          let actionType = 'note';
          
          if (text.includes('remind')) actionType = 'reminder';
          else if (text.includes('call')) actionType = 'call';
          else if (text.includes('text')) actionType = 'text';
          else if (text.includes('email')) actionType = 'email';
          
          analysisResult.extractedTasks = [{
            title: rawTranscription.slice(0, 50),
            description: rawTranscription,
            priority: 'medium',
            actionType,
            scheduledFor: parsedTime ? parsedTime.toISOString() : null,
            contactInfo: {}
          }];
        }
      }
    } else {
      console.warn('⚠️ ChatGPT failed, using raw transcription with basic parsing');
      const parsedTime = parseTimeExpression(rawTranscription.toLowerCase());
      if (parsedTime) {
        analysisResult.extractedTasks = [{
          title: rawTranscription.slice(0, 50),
          description: rawTranscription,
          priority: 'medium',
          actionType: 'reminder',
          scheduledFor: parsedTime.toISOString(),
          contactInfo: {}
        }];
      }
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
