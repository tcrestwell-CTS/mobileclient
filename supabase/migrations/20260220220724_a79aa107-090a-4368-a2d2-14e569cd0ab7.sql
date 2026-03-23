
-- Add virtual card tracking columns to trip_payments
ALTER TABLE public.trip_payments
  ADD COLUMN IF NOT EXISTS payment_method_choice text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS virtual_card_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS virtual_card_id text DEFAULT NULL;

-- Create agent notifications table for virtual card readiness alerts
CREATE TABLE public.agent_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'virtual_card_ready',
  title text NOT NULL,
  message text NOT NULL,
  trip_payment_id uuid REFERENCES public.trip_payments(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.agent_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.agent_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.agent_notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.agent_notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_notifications;
