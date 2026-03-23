-- Add auth.uid() verification inside accept_invitation for defense-in-depth
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token text, accepting_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  inv_record RECORD;
BEGIN
  -- Defense-in-depth: Verify the accepting_user_id matches the authenticated user
  IF accepting_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: user ID mismatch';
  END IF;

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

  -- Update the profile with the commission tier from the invitation
  UPDATE public.profiles
  SET commission_tier = inv_record.commission_tier
  WHERE user_id = accepting_user_id;

  -- Mark invitation as accepted
  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = inv_record.id;

  RETURN true;
END;
$$;