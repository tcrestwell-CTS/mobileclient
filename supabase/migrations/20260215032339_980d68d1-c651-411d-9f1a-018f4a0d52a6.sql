
-- Allow agents to check portal session existence for their own clients
CREATE POLICY "Agents can view portal sessions for their clients"
ON public.client_portal_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_portal_sessions.client_id
    AND clients.user_id = auth.uid()
  )
);

-- Allow admins to view all portal sessions
CREATE POLICY "Admins can view all portal sessions"
ON public.client_portal_sessions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow office admins to view all portal sessions
CREATE POLICY "Office admins can view all portal sessions"
ON public.client_portal_sessions
FOR SELECT
USING (has_role(auth.uid(), 'office_admin'::app_role));
