-- Fix: Remove overly permissive anon SELECT policy on signup_verification_codes
-- Verification is handled server-side via the send-signup-otp edge function using service role
DROP POLICY IF EXISTS "Anyone can read their own verification codes" ON public.signup_verification_codes;