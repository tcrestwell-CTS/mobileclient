
CREATE TABLE IF NOT EXISTS public.checkout_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'usd',
  payment_method text NOT NULL,
  payment_type text,
  booking_ref text,
  trip_name text,
  notes text,
  status text DEFAULT 'pending',
  stripe_payment_intent_id text UNIQUE,
  affirm_charge_id text UNIQUE,
  stripe_client_secret text,
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE public.checkout_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can create checkout payments"
  ON public.checkout_payments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role manages checkout payments"
  ON public.checkout_payments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS checkout_payments_status_idx ON public.checkout_payments (status);
CREATE INDEX IF NOT EXISTS checkout_payments_booking_ref_idx ON public.checkout_payments (booking_ref);
CREATE INDEX IF NOT EXISTS checkout_payments_email_idx ON public.checkout_payments (customer_email);
CREATE INDEX IF NOT EXISTS checkout_payments_stripe_intent_idx ON public.checkout_payments (stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS checkout_payments_affirm_charge_idx ON public.checkout_payments (affirm_charge_id);

CREATE TRIGGER checkout_payments_updated_at
  BEFORE UPDATE ON public.checkout_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
