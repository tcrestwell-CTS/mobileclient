
-- Add deposit configuration and post-trip tracking to trips
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS deposit_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_trip_email_sent boolean DEFAULT false;

-- Add terms acceptance timestamp to trip_payments
ALTER TABLE public.trip_payments
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
