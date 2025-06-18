
-- Create a table for transcriptions that the edge function expects
CREATE TABLE public.transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  audio_length INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (for future authentication)
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (we'll add proper RLS later when authentication is implemented)
CREATE POLICY "Allow all operations for now" 
  ON public.transcriptions 
  FOR ALL 
  USING (true)
  WITH CHECK (true);
