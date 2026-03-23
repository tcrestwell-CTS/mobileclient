
-- Add payment mode and deposit override fields to trips
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'deposit_balance',
  ADD COLUMN IF NOT EXISTS deposit_override boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.trips.payment_mode IS 'deposit_balance or payment_schedule';
COMMENT ON COLUMN public.trips.deposit_override IS 'When true, agent manually set deposit_amount instead of auto 25%';
