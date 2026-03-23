
-- Trip insurance settings (per-trip configuration)
CREATE TABLE public.trip_insurance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  amount_to_insure NUMERIC DEFAULT 0,
  use_full_trip_cost BOOLEAN DEFAULT true,
  ready_for_client_review BOOLEAN DEFAULT false,
  allow_skip_selection BOOLEAN DEFAULT false,
  agency_disclaimer TEXT DEFAULT 'You are responsible for knowing travel insurance rules and regulations. This is the technology platform used by agents to book trips and is not responsible for knowing travel insurance rules and regulations.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_id)
);

ALTER TABLE public.trip_insurance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own insurance settings"
  ON public.trip_insurance_settings FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Insurance quotes (manual quotes added by agent)
CREATE TABLE public.trip_insurance_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  provider_name TEXT NOT NULL,
  plan_name TEXT,
  premium_amount NUMERIC NOT NULL DEFAULT 0,
  coverage_amount NUMERIC DEFAULT 0,
  coverage_details TEXT,
  quote_url TEXT,
  is_recommended BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_insurance_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own insurance quotes"
  ON public.trip_insurance_quotes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Client insurance responses
CREATE TABLE public.trip_insurance_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  response_type TEXT NOT NULL CHECK (response_type IN ('accepted', 'declined_no_insurance', 'declined_buying_elsewhere')),
  selected_quote_id UUID REFERENCES public.trip_insurance_quotes(id) ON DELETE SET NULL,
  acknowledgment_text TEXT,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_insurance_responses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (agents) to read responses for their trips
CREATE POLICY "Users can read insurance responses for their trips"
  ON public.trip_insurance_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()
    )
  );

-- Allow anon/public inserts for client portal responses
CREATE POLICY "Clients can insert insurance responses"
  ON public.trip_insurance_responses FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow public read of insurance quotes for client portal
CREATE POLICY "Anyone can read insurance quotes for published trips"
  ON public.trip_insurance_quotes FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_insurance_settings s
      WHERE s.trip_id = trip_insurance_quotes.trip_id AND s.ready_for_client_review = true
    )
  );

-- Allow public read of insurance settings for client portal
CREATE POLICY "Anyone can read insurance settings for published trips"
  ON public.trip_insurance_settings FOR SELECT TO anon
  USING (ready_for_client_review = true);
