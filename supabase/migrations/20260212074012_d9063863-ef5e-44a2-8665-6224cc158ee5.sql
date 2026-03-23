
-- Enable RLS (may already be enabled, safe to run)
ALTER TABLE public.client_portal_sessions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "System can manage own sessions" ON public.client_portal_sessions;
DROP POLICY IF EXISTS "Deny anonymous access to sessions" ON public.client_portal_sessions;

-- Only service_role (edge functions) should access this table.
-- No policies = no access for anon or authenticated roles, which is correct.
-- Edge functions use service_role key which bypasses RLS.
