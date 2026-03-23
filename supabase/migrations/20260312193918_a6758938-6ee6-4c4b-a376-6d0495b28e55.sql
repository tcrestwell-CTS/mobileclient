ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS commission_override_amount numeric NULL,
  ADD COLUMN IF NOT EXISTS override_approved boolean NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_approved_by uuid NULL,
  ADD COLUMN IF NOT EXISTS override_approved_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS override_notes text NULL,
  ADD COLUMN IF NOT EXISTS override_pending_approval boolean NULL DEFAULT false;