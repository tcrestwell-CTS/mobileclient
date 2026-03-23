-- Drop the automatic profile creation trigger
-- Profiles should only be created when an invitation is accepted
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Update the accept_invitation function to create profile if it doesn't exist
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token text, accepting_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv_record RECORD;
  user_email text;
  user_name text;
  user_avatar text;
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

  -- Get user metadata from auth.users
  SELECT 
    email,
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'avatar_url'
  INTO user_email, user_name, user_avatar
  FROM auth.users
  WHERE id = accepting_user_id;

  -- Create the profile for the new user (only on invitation acceptance)
  INSERT INTO public.profiles (user_id, full_name, avatar_url, commission_tier, agency_name)
  VALUES (
    accepting_user_id,
    COALESCE(user_name, split_part(user_email, '@', 1)),
    user_avatar,
    inv_record.commission_tier,
    'Crestwell Travel Services'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    commission_tier = inv_record.commission_tier;

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
$function$;