
-- Create workflow_tasks table
CREATE TABLE public.workflow_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'follow_up',
  status TEXT NOT NULL DEFAULT 'pending',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own workflow tasks"
ON public.workflow_tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all workflow tasks"
ON public.workflow_tasks FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own workflow tasks"
ON public.workflow_tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflow tasks"
ON public.workflow_tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflow tasks"
ON public.workflow_tasks FOR DELETE
USING (auth.uid() = user_id);

-- Add columns to trips
ALTER TABLE public.trips
ADD COLUMN proposal_sent_at TIMESTAMPTZ,
ADD COLUMN follow_up_due_at TIMESTAMPTZ;

-- Enable realtime for workflow_tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_tasks;
