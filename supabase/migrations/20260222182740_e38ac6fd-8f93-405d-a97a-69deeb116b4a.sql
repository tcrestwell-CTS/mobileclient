
-- Table to map agents to their Stripe connected accounts
CREATE TABLE public.stripe_connected_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  business_name TEXT,
  onboarding_status TEXT NOT NULL DEFAULT 'pending',
  card_issuing_status TEXT NOT NULL DEFAULT 'inactive',
  transfers_status TEXT NOT NULL DEFAULT 'inactive',
  requirements_due JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stripe_connected_accounts ENABLE ROW LEVEL SECURITY;

-- Policies: agents can only see/manage their own connected account
CREATE POLICY "Users can view their own connected account"
  ON public.stripe_connected_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connected account"
  ON public.stripe_connected_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connected account"
  ON public.stripe_connected_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all connected accounts"
  ON public.stripe_connected_accounts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER update_stripe_connected_accounts_updated_at
  BEFORE UPDATE ON public.stripe_connected_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
