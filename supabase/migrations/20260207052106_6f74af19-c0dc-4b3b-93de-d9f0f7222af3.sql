-- Office admins can view all clients (read-only)
CREATE POLICY "Office admins can view all clients"
ON public.clients
FOR SELECT
USING (public.has_role(auth.uid(), 'office_admin'));

-- Office admins can view all bookings (read-only)
CREATE POLICY "Office admins can view all bookings"
ON public.bookings
FOR SELECT
USING (public.has_role(auth.uid(), 'office_admin'));

-- Office admins can view all commissions (read-only)
CREATE POLICY "Office admins can view all commissions"
ON public.commissions
FOR SELECT
USING (public.has_role(auth.uid(), 'office_admin'));