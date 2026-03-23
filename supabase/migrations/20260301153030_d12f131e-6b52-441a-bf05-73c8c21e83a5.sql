
-- Active session heartbeat table
CREATE TABLE public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  current_route text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint: one row per user (upsert pattern)
CREATE UNIQUE INDEX idx_active_sessions_user_id ON public.active_sessions (user_id);

-- Index for quick "who's online" queries
CREATE INDEX idx_active_sessions_last_seen ON public.active_sessions (last_seen_at DESC);

-- Enable RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Users can upsert their own session
CREATE POLICY "Users can upsert their own session"
  ON public.active_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session"
  ON public.active_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
  ON public.active_sessions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Office admins can view all sessions
CREATE POLICY "Office admins can view all sessions"
  ON public.active_sessions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'office_admin'::app_role));

-- Users can view their own session
CREATE POLICY "Users can view own session"
  ON public.active_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own session (logout cleanup)
CREATE POLICY "Users can delete own session"
  ON public.active_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
