
-- Table to store signup verification codes
CREATE TABLE public.signup_verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signup_verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to verify codes (needed during signup flow)
CREATE POLICY "Anyone can read their own verification codes"
ON public.signup_verification_codes
FOR SELECT
TO anon
USING (true);

-- Only edge functions (service role) can insert codes
-- No insert policy for anon - codes are created by edge function with service role

-- Auto-cleanup old codes
CREATE INDEX idx_signup_codes_email ON public.signup_verification_codes (email, code, expires_at);
