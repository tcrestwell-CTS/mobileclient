
-- Create CC authorizations table
CREATE TABLE public.cc_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  -- Encrypted CC fields (encrypted via edge function, never raw on client)
  encrypted_card_number TEXT,
  encrypted_cvv TEXT,
  encrypted_expiry TEXT,
  last_four TEXT,
  cardholder_name TEXT,
  billing_zip TEXT,
  -- Authorization details
  authorization_amount NUMERIC NOT NULL DEFAULT 0,
  authorization_description TEXT,
  signature_url TEXT,
  -- Access & lifecycle
  access_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  authorized_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  auto_delete_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cc_authorizations ENABLE ROW LEVEL SECURITY;

-- Agent policies (owner)
CREATE POLICY "Users can view their own cc authorizations"
  ON public.cc_authorizations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cc authorizations"
  ON public.cc_authorizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cc authorizations"
  ON public.cc_authorizations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cc authorizations"
  ON public.cc_authorizations FOR DELETE
  USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all cc authorizations"
  ON public.cc_authorizations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all cc authorizations"
  ON public.cc_authorizations FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all cc authorizations"
  ON public.cc_authorizations FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Office admin read-only
CREATE POLICY "Office admins can view all cc authorizations"
  ON public.cc_authorizations FOR SELECT
  USING (has_role(auth.uid(), 'office_admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_cc_authorizations_updated_at
  BEFORE UPDATE ON public.cc_authorizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for signatures
INSERT INTO storage.buckets (id, name, public) VALUES ('cc-signatures', 'cc-signatures', false);

-- Signature storage policies
CREATE POLICY "Users can upload cc signatures"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cc-signatures' AND auth.role() = 'anon');

CREATE POLICY "Authenticated users can view cc signatures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cc-signatures' AND auth.role() = 'authenticated');
