-- Remove the public SELECT policy from signup_verification_codes
DROP POLICY IF EXISTS "Anyone can read their own verification codes" ON public.signup_verification_codes;

-- No public access needed anymore - edge function uses service role key

-- Secure client_portal_sessions table - it has RLS enabled but no policies
-- Only edge functions (using service role) should access this table
-- Deny all direct access via the public API
CREATE POLICY "Deny all direct access to portal sessions"
ON public.client_portal_sessions FOR SELECT
USING (false);