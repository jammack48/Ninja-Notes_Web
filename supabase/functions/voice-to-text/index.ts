
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  console.log(`Processing base64 string of length: ${base64String.length}`);
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

  console.log(`Processed audio binary of size: ${result.length} bytes`);
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('Voice-to-text function called');

  try {
    const { audio } = await req.json();
    
    if (!audio) {
      console.error('No audio data provided in request');
      throw new Error('No audio data provided');
    }

    console.log('Audio data received, length:', audio.length);

    // Check if OpenAI API key is available
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY environment variable not set');
      throw new Error('OpenAI API key not configured. Please check your Supabase Edge Function secrets.');
    }

    console.log('OpenAI API key found, processing audio...');

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Prepare form data for OpenAI Whisper
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    console.log('Sending request to OpenAI Whisper API...');

    // Send to OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    console.log('OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const transcribedText = result.text;

    console.log('Transcription successful:', transcribedText);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      throw new Error('Supabase configuration not found');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save transcription to database
    console.log('Saving transcription to database...');
    const { data, error } = await supabase
      .from('transcriptions')
      .insert([{
        text: transcribedText,
        audio_length: binaryAudio.length,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      // Don't throw here - transcription was successful, database save is optional
      console.log('Continuing despite database error...');
    } else {
      console.log('Transcription saved to database:', data);
    }

    return new Response(
      JSON.stringify({ 
        text: transcribedText,
        id: data?.id || null,
        success: true
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in voice-to-text function:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.message.includes('API key')) {
      errorMessage = 'OpenAI API key not configured. Please check your Supabase Edge Function secrets.';
    } else if (error.message.includes('OpenAI API error')) {
      errorMessage = 'OpenAI service error. Please try again later.';
    } else if (error.message.includes('No audio data')) {
      errorMessage = 'No audio data received. Please try recording again.';
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
        details: error.message 
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
