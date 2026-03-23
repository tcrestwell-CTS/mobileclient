
-- =============================================
-- 1. Training Modules (admin-defined curriculum)
-- =============================================
CREATE TABLE public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  is_required boolean NOT NULL DEFAULT false,
  estimated_minutes integer DEFAULT 30,
  resource_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view training modules"
  ON public.training_modules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert training modules"
  ON public.training_modules FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update training modules"
  ON public.training_modules FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete training modules"
  ON public.training_modules FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. Agent Training Progress
-- =============================================
CREATE TABLE public.agent_training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

ALTER TABLE public.agent_training_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own training progress"
  ON public.agent_training_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training progress"
  ON public.agent_training_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training progress"
  ON public.agent_training_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all training progress"
  ON public.agent_training_progress FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Office admins can view all training progress"
  ON public.agent_training_progress FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'office_admin'::app_role));

-- =============================================
-- 3. Mentor Assignments
-- =============================================
CREATE TABLE public.mentor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_user_id uuid NOT NULL,
  mentor_user_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mentee_user_id, mentor_user_id)
);

ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mentor assignments"
  ON public.mentor_assignments FOR SELECT TO authenticated
  USING (auth.uid() = mentee_user_id OR auth.uid() = mentor_user_id);

CREATE POLICY "Admins can manage mentor assignments"
  ON public.mentor_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Office admins can view mentor assignments"
  ON public.mentor_assignments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'office_admin'::app_role));

-- =============================================
-- 4. Trip Templates (starter templates for new agents)
-- =============================================
CREATE TABLE public.trip_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  destination text,
  duration_days integer,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view public templates"
  ON public.trip_templates FOR SELECT TO authenticated
  USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Admins can manage templates"
  ON public.trip_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own templates"
  ON public.trip_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- =============================================
-- 5. Agent Onboarding Checklist Progress
-- =============================================
CREATE TABLE public.agent_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  profile_completed boolean NOT NULL DEFAULT false,
  first_client_added boolean NOT NULL DEFAULT false,
  first_trip_created boolean NOT NULL DEFAULT false,
  first_booking_added boolean NOT NULL DEFAULT false,
  branding_configured boolean NOT NULL DEFAULT false,
  training_started boolean NOT NULL DEFAULT false,
  onboarding_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own onboarding"
  ON public.agent_onboarding_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding"
  ON public.agent_onboarding_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding"
  ON public.agent_onboarding_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all onboarding"
  ON public.agent_onboarding_progress FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Office admins can view all onboarding"
  ON public.agent_onboarding_progress FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'office_admin'::app_role));

-- =============================================
-- 6. Auto-generate invoice on booking confirmation (trigger)
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_generate_invoice_on_confirm()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_number text;
  v_client_name text;
  v_trip_name text;
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    -- Check if invoice already exists for this booking
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE trip_id = NEW.trip_id 
        AND client_id = NEW.client_id 
        AND user_id = NEW.user_id
    ) THEN
      -- Get invoice number
      v_invoice_number := public.get_next_invoice_number(NEW.user_id);
      
      -- Get client name
      SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
      
      -- Get trip name
      IF NEW.trip_id IS NOT NULL THEN
        SELECT trip_name INTO v_trip_name FROM public.trips WHERE id = NEW.trip_id;
      END IF;
      
      INSERT INTO public.invoices (
        user_id, invoice_number, client_id, client_name,
        trip_id, trip_name, total_amount, amount_remaining, status
      ) VALUES (
        NEW.user_id, v_invoice_number, NEW.client_id, v_client_name,
        NEW.trip_id, COALESCE(v_trip_name, NEW.trip_name), NEW.gross_sales, NEW.gross_sales, 'sent'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_invoice_on_confirm
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_invoice_on_confirm();

-- =============================================
-- 7. Auto-calculate commission on booking save
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_calculate_commission()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_supplier_rate numeric;
  v_supplier_commissionable_pct numeric;
  v_agent_tier text;
  v_agent_split numeric;
  v_commissionable numeric;
  v_commission numeric;
BEGIN
  -- Only auto-calc if no manual override
  IF NEW.commission_override_amount IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get supplier commission rate
  IF NEW.supplier_id IS NOT NULL THEN
    SELECT commission_rate, commissionable_percentage 
    INTO v_supplier_rate, v_supplier_commissionable_pct
    FROM public.suppliers WHERE id = NEW.supplier_id;
  END IF;

  IF v_supplier_rate IS NOT NULL AND v_supplier_commissionable_pct IS NOT NULL THEN
    v_commissionable := NEW.gross_sales * (v_supplier_commissionable_pct / 100);
    v_commission := v_commissionable * (v_supplier_rate / 100);
    
    NEW.commissionable_amount := v_commissionable;
    NEW.commission_revenue := v_commission;
    NEW.calculated_commission := v_commission;
    NEW.net_sales := NEW.gross_sales - COALESCE(NEW.supplier_payout, 0);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_calc_commission
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_calculate_commission();

-- =============================================
-- 8. Payment reminder notification trigger function
-- (called by scheduled edge function)
-- =============================================
CREATE OR REPLACE FUNCTION public.check_upcoming_payment_deadlines()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Find bookings with payment deadlines in next 7 days that haven't been notified
  FOR r IN
    SELECT b.id, b.user_id, b.booking_reference, b.payment_deadline, b.trip_name, b.destination,
           c.name as client_name
    FROM public.bookings b
    JOIN public.clients c ON c.id = b.client_id
    WHERE b.payment_deadline IS NOT NULL
      AND b.payment_deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND b.status NOT IN ('cancelled', 'archived')
      AND NOT EXISTS (
        SELECT 1 FROM public.agent_notifications n
        WHERE n.user_id = b.user_id
          AND n.type = 'payment_reminder'
          AND n.message LIKE '%' || b.booking_reference || '%'
          AND n.created_at > now() - INTERVAL '7 days'
      )
  LOOP
    INSERT INTO public.agent_notifications (user_id, type, title, message)
    VALUES (
      r.user_id,
      'payment_reminder',
      'Payment Due Soon: ' || COALESCE(r.client_name, 'Client'),
      'Booking ' || r.booking_reference || ' for ' || COALESCE(r.destination, 'trip') || 
      ' has a payment deadline on ' || to_char(r.payment_deadline, 'Mon DD, YYYY') || '.'
    );
  END LOOP;
END;
$$;

-- =============================================
-- 9. Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_training_progress_user ON public.agent_training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_module ON public.agent_training_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_mentee ON public.mentor_assignments(mentee_user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_mentor ON public.mentor_assignments(mentor_user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON public.agent_onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline ON public.bookings(payment_deadline) WHERE payment_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trip_templates_public ON public.trip_templates(is_public) WHERE is_public = true;
