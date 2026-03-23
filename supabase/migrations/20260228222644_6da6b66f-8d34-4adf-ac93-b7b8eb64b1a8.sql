
-- Table linking Supabase Auth users to CRM client records for persistent portal auth
CREATE TABLE public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Clients can read their own profile
CREATE POLICY "Users can view their own client profile"
  ON public.client_profiles FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Service role inserts during signup (no user-facing INSERT policy needed)
-- But allow authenticated users to read for the portal-data function
CREATE POLICY "Users can insert their own client profile"
  ON public.client_profiles FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- Index for fast lookup by email via auth_user_id
CREATE INDEX idx_client_profiles_auth_user ON public.client_profiles(auth_user_id);
CREATE INDEX idx_client_profiles_client ON public.client_profiles(client_id);

-- Trigger for updated_at
CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
