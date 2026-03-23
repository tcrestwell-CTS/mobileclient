
-- Create trip_statuses table for customizable workflow columns
CREATE TABLE public.trip_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_statuses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own statuses" ON public.trip_statuses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own statuses" ON public.trip_statuses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own statuses" ON public.trip_statuses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own statuses" ON public.trip_statuses
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all statuses" ON public.trip_statuses
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_trip_statuses_updated_at
  BEFORE UPDATE ON public.trip_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Unique constraint on name per user
ALTER TABLE public.trip_statuses ADD CONSTRAINT trip_statuses_user_name_unique UNIQUE (user_id, name);
