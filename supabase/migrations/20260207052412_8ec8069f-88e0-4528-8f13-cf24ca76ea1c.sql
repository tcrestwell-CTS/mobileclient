-- Office admins can view all profiles (read-only)
CREATE POLICY "Office admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'office_admin'));

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));