
-- Add Stripe tracking columns to trip_payments
ALTER TABLE public.trip_payments
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_url text;
