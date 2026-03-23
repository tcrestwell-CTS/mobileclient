
-- 1. AGENCIES table
CREATE TABLE public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL,
  logo_url text,
  website text,
  phone text,
  email text,
  address text,
  tagline text,
  primary_color text DEFAULT '#1e3a5f',
  accent_color text DEFAULT '#d4af37',
  asta_number text,
  clia_number text,
  iata_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency" ON public.agencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage agencies" ON public.agencies FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can update agency" ON public.agencies FOR UPDATE TO authenticated USING (auth.uid() = owner_user_id);

-- 2. QUOTES table
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  quote_number text NOT NULL,
  title text NOT NULL,
  description text,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  valid_until date,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own quotes" ON public.quotes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all quotes" ON public.quotes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Office admins can view all quotes" ON public.quotes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'office_admin'::app_role));

-- 3. ACTIVITIES table
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activities" ON public.activities FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all activities" ON public.activities FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Office admins can view all activities" ON public.activities FOR SELECT TO authenticated USING (has_role(auth.uid(), 'office_admin'::app_role));

-- 4. VIEWS for renamed tables (additive, no breaking changes)
CREATE VIEW public.payments WITH (security_invoker = on) AS SELECT * FROM public.trip_payments;
CREATE VIEW public.tasks WITH (security_invoker = on) AS SELECT * FROM public.workflow_tasks;
