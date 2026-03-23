
-- Table for secure client self-service update tokens
CREATE TABLE public.client_update_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.client_update_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own tokens"
  ON public.client_update_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tokens"
  ON public.client_update_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON public.client_update_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast token lookup
CREATE INDEX idx_client_update_tokens_token ON public.client_update_tokens(token);
