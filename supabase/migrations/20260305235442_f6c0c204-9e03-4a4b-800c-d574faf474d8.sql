
-- Agent messages table for team chat and DMs
CREATE TABLE public.agent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID DEFAULT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'team',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- Team messages: all authenticated can read
CREATE POLICY "Users can read team messages"
ON public.agent_messages FOR SELECT TO authenticated
USING (
  channel = 'team'
);

-- DM messages: only sender or recipient can read
CREATE POLICY "Users can read their own DMs"
ON public.agent_messages FOR SELECT TO authenticated
USING (
  channel = 'dm' AND (auth.uid() = sender_id OR auth.uid() = recipient_id)
);

-- Any authenticated user can send messages
CREATE POLICY "Users can send messages"
ON public.agent_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.agent_messages FOR DELETE TO authenticated
USING (auth.uid() = sender_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_messages;
