
ALTER TABLE public.checkout_payments
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS travel_date text,
  ADD COLUMN IF NOT EXISTS total_months integer,
  ADD COLUMN IF NOT EXISTS months_paid integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missed_payments integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fees_applied integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_cancelled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_cancelled_reason text;
