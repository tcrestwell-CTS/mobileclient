-- Allow authenticated users to read invitations sent to their email address
-- This is needed for the invitation acceptance flow where new users don't have a role yet
CREATE POLICY "Users can view invitations for their email"
ON public.invitations
FOR SELECT
TO authenticated
USING (email = lower(auth.email()));
