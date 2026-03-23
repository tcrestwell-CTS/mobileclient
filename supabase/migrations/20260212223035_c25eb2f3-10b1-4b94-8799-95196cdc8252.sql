-- Drop the overly permissive public policy that exposes email addresses
DROP POLICY IF EXISTS "Anyone can check pending invitations by email" ON public.invitations;

-- Replace with a policy that only allows authenticated users to check pending invitations
-- This covers the post-signup invitation acceptance flow
CREATE POLICY "Authenticated users can check pending invitations"
ON public.invitations FOR SELECT
TO authenticated
USING ((status = 'pending') AND (expires_at > now()));