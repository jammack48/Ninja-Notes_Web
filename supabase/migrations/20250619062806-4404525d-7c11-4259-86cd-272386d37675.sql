
-- Create scheduled_actions table to store actionable tasks
CREATE TABLE public.scheduled_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('reminder', 'call', 'text', 'email', 'note')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  contact_info JSONB,
  notification_settings JSONB DEFAULT '{"web_push": true, "email": false, "sms": false}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_scheduled_actions_scheduled_for ON public.scheduled_actions(scheduled_for);
CREATE INDEX idx_scheduled_actions_status ON public.scheduled_actions(status);
CREATE INDEX idx_scheduled_actions_task_id ON public.scheduled_actions(task_id);

-- Enable RLS
ALTER TABLE public.scheduled_actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (making it public for now since we don't have auth)
CREATE POLICY "Allow all operations on scheduled_actions" 
  ON public.scheduled_actions 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Add action-related columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN action_type TEXT DEFAULT 'note' CHECK (action_type IN ('reminder', 'call', 'text', 'email', 'note')),
ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE,
ADD COLUMN contact_info JSONB,
ADD COLUMN reminder_settings JSONB DEFAULT '{"web_push": true}'::jsonb;

-- Enable pg_cron extension for background jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to process due actions
CREATE OR REPLACE FUNCTION public.process_due_actions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update expired pending actions to trigger notifications
  UPDATE public.scheduled_actions 
  SET status = 'completed', updated_at = now()
  WHERE status = 'pending' 
    AND scheduled_for <= now();
END;
$$;

-- Schedule the function to run every minute
SELECT cron.schedule(
  'process-due-actions',
  '* * * * *',
  'SELECT public.process_due_actions();'
);
