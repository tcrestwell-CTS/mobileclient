-- Create function to accept invitation and assign role
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token text, accepting_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_record RECORD;
BEGIN
  -- Find valid pending invitation
  SELECT * INTO inv_record
  FROM public.invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Assign the role from invitation
  INSERT INTO public.user_roles (user_id, role)
  VALUES (accepting_user_id, inv_record.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Mark invitation as accepted
  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = inv_record.id;

  RETURN true;
END;
$$;