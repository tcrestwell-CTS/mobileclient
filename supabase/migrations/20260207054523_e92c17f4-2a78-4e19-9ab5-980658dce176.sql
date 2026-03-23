-- Add admin policies for clients table (consistent with RBAC design)
-- Admins should have full CRUD access to all clients

CREATE POLICY "Admins can view all clients"
ON public.clients
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all clients"
ON public.clients
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all clients"
ON public.clients
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));