
-- Create a table for tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (for future authentication)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (we'll add proper RLS later when authentication is implemented)
CREATE POLICY "Allow all operations for now" 
  ON public.tasks 
  FOR ALL 
  USING (true)
  WITH CHECK (true);
