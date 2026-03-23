
-- Fix the overly permissive INSERT policy on agent_notifications
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.agent_notifications;

-- Only authenticated users (or service role) can insert notifications
CREATE POLICY "Authenticated can insert notifications"
  ON public.agent_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
