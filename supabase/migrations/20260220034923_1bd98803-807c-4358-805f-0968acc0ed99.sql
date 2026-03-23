
-- Create webhook_leads table to store inbound lead payloads
CREATE TABLE public.webhook_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  lead_id text,
  name text,
  email text,
  phone text,
  location text,
  budget text,
  project_type text,
  timeline text,
  source text NOT NULL DEFAULT 'webhook',
  status text NOT NULL DEFAULT 'new',
  raw_payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_leads_lead_id_user_id_key UNIQUE (user_id, lead_id)
);

ALTER TABLE public.webhook_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own webhook leads"
  ON public.webhook_leads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhook leads"
  ON public.webhook_leads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhook leads"
  ON public.webhook_leads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all webhook leads"
  ON public.webhook_leads FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Office admins can view all webhook leads"
  ON public.webhook_leads FOR SELECT
  USING (has_role(auth.uid(), 'office_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_webhook_leads_updated_at
  BEFORE UPDATE ON public.webhook_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
