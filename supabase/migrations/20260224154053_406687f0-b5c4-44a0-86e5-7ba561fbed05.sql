
-- 1. Agency settings (single-row config table)
CREATE TABLE public.agency_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  approval_threshold numeric NOT NULL DEFAULT 10000,
  commission_holdback_pct numeric NOT NULL DEFAULT 10,
  tier_auto_promote boolean NOT NULL DEFAULT false,
  tier_1_threshold numeric NOT NULL DEFAULT 100000,
  tier_2_threshold numeric NOT NULL DEFAULT 250000,
  evaluation_period_months integer NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings
CREATE POLICY "Authenticated users can view agency settings"
  ON public.agency_settings FOR SELECT TO authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert agency settings"
  ON public.agency_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update agency settings"
  ON public.agency_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Booking approval fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS approval_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_type text;

-- 3. Commission holdback fields
ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS holdback_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS holdback_released boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS holdback_released_at timestamptz;

-- 4. Trigger to release holdbacks when trip completes
CREATE OR REPLACE FUNCTION public.release_commission_holdbacks()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.commissions
    SET holdback_released = true,
        holdback_released_at = now(),
        updated_at = now()
    WHERE booking_id IN (
      SELECT id FROM public.bookings WHERE trip_id = NEW.id
    )
    AND holdback_released = false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_release_holdbacks
  AFTER UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.release_commission_holdbacks();

-- 5. Indexes for performance at scale
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_booking_id ON public.commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_approval ON public.bookings(approval_required) WHERE approval_required = true;
