-- Allow admins to view all commissions
CREATE POLICY "Admins can view all commissions"
ON public.commissions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update all commissions
CREATE POLICY "Admins can update all commissions"
ON public.commissions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));