
-- 1. Compliance audit log table
CREATE TABLE public.compliance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  client_name text,
  ip_address text,
  user_agent text,
  signature text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
  ON public.compliance_audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs"
  ON public.compliance_audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON public.compliance_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Office admins can view all audit logs"
  ON public.compliance_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'office_admin'::app_role));

-- 2. Supplier cancellation fields on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_penalty numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_refund_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- 3. Indexes for audit log queries
CREATE INDEX idx_compliance_audit_event_type ON public.compliance_audit_log(event_type);
CREATE INDEX idx_compliance_audit_user_id ON public.compliance_audit_log(user_id);
CREATE INDEX idx_compliance_audit_created_at ON public.compliance_audit_log(created_at);
