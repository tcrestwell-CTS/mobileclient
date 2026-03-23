
-- Table to store magic link sessions for client portal access
CREATE TABLE public.client_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast token lookups
CREATE INDEX idx_portal_sessions_token ON public.client_portal_sessions(token);
CREATE INDEX idx_portal_sessions_client ON public.client_portal_sessions(client_id);

-- Enable RLS (access via edge functions with service role)
ALTER TABLE public.client_portal_sessions ENABLE ROW LEVEL SECURITY;

-- Only service role / edge functions can access this table
-- No direct client access policies needed since portal uses edge functions

-- Portal messages between clients and their agents
CREATE TABLE public.portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_user_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('client', 'agent')),
  message text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_messages_client ON public.portal_messages(client_id);

ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;

-- Agents can view messages for their clients
CREATE POLICY "Agents can view messages for their clients"
  ON public.portal_messages FOR SELECT
  USING (auth.uid() = agent_user_id);

-- Agents can insert messages  
CREATE POLICY "Agents can insert messages"
  ON public.portal_messages FOR INSERT
  WITH CHECK (auth.uid() = agent_user_id AND sender_type = 'agent');

-- Admins can view all messages
CREATE POLICY "Admins can view all portal messages"
  ON public.portal_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Office admins can view all messages
CREATE POLICY "Office admins can view all portal messages"
  ON public.portal_messages FOR SELECT
  USING (has_role(auth.uid(), 'office_admin'::app_role));

-- Agents can mark messages as read
CREATE POLICY "Agents can update their messages"
  ON public.portal_messages FOR UPDATE
  USING (auth.uid() = agent_user_id);
