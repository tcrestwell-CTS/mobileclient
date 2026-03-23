-- Create email_logs table to track sent emails
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own email logs
CREATE POLICY "Users can view their own email logs"
ON public.email_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own email logs
CREATE POLICY "Users can insert their own email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all email logs
CREATE POLICY "Admins can view all email logs"
ON public.email_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Office admins can view all email logs
CREATE POLICY "Office admins can view all email logs"
ON public.email_logs
FOR SELECT
USING (has_role(auth.uid(), 'office_admin'::app_role));

-- Create index for faster client lookups
CREATE INDEX idx_email_logs_client_id ON public.email_logs(client_id);
CREATE INDEX idx_email_logs_user_id ON public.email_logs(user_id);