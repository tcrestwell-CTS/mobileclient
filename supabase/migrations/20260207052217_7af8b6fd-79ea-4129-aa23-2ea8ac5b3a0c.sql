-- Office admins can view all invitations (read-only)
CREATE POLICY "Office admins can view all invitations"
ON public.invitations
FOR SELECT
USING (public.has_role(auth.uid(), 'office_admin'));