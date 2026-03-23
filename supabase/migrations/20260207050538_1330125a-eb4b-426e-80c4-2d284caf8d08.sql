-- Allow admins to view all bookings
CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update all bookings
CREATE POLICY "Admins can update all bookings"
ON public.bookings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete all bookings
CREATE POLICY "Admins can delete all bookings"
ON public.bookings
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));