-- Allow unauthenticated users to check if a pending invitation exists for their email during signup
CREATE POLICY "Anyone can check pending invitations by email"
ON public.invitations
FOR SELECT
TO anon
USING (status = 'pending' AND expires_at > now());
