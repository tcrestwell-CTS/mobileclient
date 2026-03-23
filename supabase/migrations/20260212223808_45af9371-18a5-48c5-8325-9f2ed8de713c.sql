-- =============================================
-- CLIENTS TABLE: Scope all policies to authenticated
-- =============================================
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
CREATE POLICY "Users can insert their own clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
CREATE POLICY "Admins can view all clients" ON public.clients FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all clients" ON public.clients;
CREATE POLICY "Admins can update all clients" ON public.clients FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete all clients" ON public.clients;
CREATE POLICY "Admins can delete all clients" ON public.clients FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Office admins can view all clients" ON public.clients;
CREATE POLICY "Office admins can view all clients" ON public.clients FOR SELECT TO authenticated USING (has_role(auth.uid(), 'office_admin'::app_role));

-- =============================================
-- CLIENT_COMPANIONS TABLE: Scope all policies to authenticated
-- =============================================
DROP POLICY IF EXISTS "Users can view companions for their clients" ON public.client_companions;
CREATE POLICY "Users can view companions for their clients" ON public.client_companions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert companions for their clients" ON public.client_companions;
CREATE POLICY "Users can insert companions for their clients" ON public.client_companions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update companions for their clients" ON public.client_companions;
CREATE POLICY "Users can update companions for their clients" ON public.client_companions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete companions for their clients" ON public.client_companions;
CREATE POLICY "Users can delete companions for their clients" ON public.client_companions FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all companions" ON public.client_companions;
CREATE POLICY "Admins can view all companions" ON public.client_companions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all companions" ON public.client_companions;
CREATE POLICY "Admins can update all companions" ON public.client_companions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete all companions" ON public.client_companions;
CREATE POLICY "Admins can delete all companions" ON public.client_companions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Office admins can view all companions" ON public.client_companions;
CREATE POLICY "Office admins can view all companions" ON public.client_companions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'office_admin'::app_role));

-- =============================================
-- BOOKINGS TABLE: Scope all policies to authenticated
-- =============================================
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own bookings" ON public.bookings;
CREATE POLICY "Users can insert their own bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
CREATE POLICY "Users can update their own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own bookings" ON public.bookings;
CREATE POLICY "Users can delete their own bookings" ON public.bookings FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
CREATE POLICY "Admins can update all bookings" ON public.bookings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete all bookings" ON public.bookings;
CREATE POLICY "Admins can delete all bookings" ON public.bookings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Office admins can view all bookings" ON public.bookings;
CREATE POLICY "Office admins can view all bookings" ON public.bookings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'office_admin'::app_role));