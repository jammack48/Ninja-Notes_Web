
-- Create a table for completed tasks
CREATE TABLE public.completed_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_task_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (for future authentication)
ALTER TABLE public.completed_tasks ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (we'll add proper RLS later when authentication is implemented)
CREATE POLICY "Allow all operations for now" 
  ON public.completed_tasks 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Enable realtime for the completed_tasks table
ALTER TABLE public.completed_tasks REPLICA IDENTITY FULL;
